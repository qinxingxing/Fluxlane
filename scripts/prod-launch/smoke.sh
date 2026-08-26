#!/usr/bin/env bash
# Production-entry smoke: CLB hostnames first.
# DIRECT_NODE_SMOKE=1 also probes backend IPs; that is diagnostic only.
set -euo pipefail

ROOT="$(cd "$(dirname "$0")" && pwd)"
# shellcheck disable=SC1091
[ -f "$ROOT/.env" ] && . "$ROOT/.env"

API_HOST="${API_HOST:-api.fluxlane.ai}"
RUN_HOST="${RUN_HOST:-run.fluxlane.ai}"
FRONTEND_ORIGIN="${FRONTEND_ORIGIN:-https://www.fluxlane.ai}"
API_NODES="${API_NODES:-api|${API_HOST}|124.156.104.48 api|${API_HOST}|43.154.68.173}"
RUN_NODES="${RUN_NODES:-run|${RUN_HOST}|43.154.184.164 run|${RUN_HOST}|150.109.45.79}"
DIRECT_NODE_SMOKE="${DIRECT_NODE_SMOKE:-0}"

fail=0
pass() { printf 'PASS  %s\n' "$1"; }
bad()  { printf 'FAIL  %s\n' "$1"; fail=1; }

curl_url() {
  local url="$1"
  shift
  curl -sS -o /tmp/prod-launch-body --write-out '%{http_code}' \
    --max-time 15 \
    "$@" \
    "$url"
}

curl_node() {
  local sni="$1" ip="$2" path="$3"
  shift 3
  curl_url "https://${sni}${path}" --resolve "${sni}:443:${ip}" "$@"
}

check_url() {
  local label="$1" url="$2" want="$3"
  shift 3
  local code
  code="$(curl_url "$url" "$@")"
  if [ "$code" != "$want" ]; then
    bad "$label $url status=$code want=$want body=$(head -c 200 /tmp/prod-launch-body)"
    return
  fi
  pass "$label $url ($code)"
}

echo "== CLB production entry (this is the pass/fail gate) =="
check_url "healthz" "https://${API_HOST}/healthz" "200" -H 'Accept: application/json'
check_url "readyz"  "https://${API_HOST}/readyz"  "200" -H 'Accept: application/json'
check_url "healthz" "https://${RUN_HOST}/healthz" "200" -H 'Accept: application/json'
check_url "readyz"  "https://${RUN_HOST}/readyz"  "200" -H 'Accept: application/json'

code="$(curl_url "https://${API_HOST}/api/status")"
if [ "$code" != "200" ] || ! grep -q '"success":true\|"success": true' /tmp/prod-launch-body; then
  bad "CLB api /api/status"
else
  pass "CLB api /api/status"
fi
# Run CLB is the inference VIP. /api/status may be unrouted (404 JSON); healthz/readyz are the gate.

echo "== SERVE_FRONTEND=false on API CLB =="
code="$(curl_url "https://${API_HOST}/" -H 'Accept: text/html,application/json')"
body="$(cat /tmp/prod-launch-body)"
if echo "$body" | grep -qi '<html'; then
  bad "API CLB GET / returned HTML"
elif [ "$code" = "404" ] && echo "$body" | grep -q 'route not found'; then
  pass "API CLB GET / is JSON 404"
else
  pass "API CLB GET / non-HTML ($code)"
fi

echo "== CORS on API CLB =="
headers="$(curl -sS -D - -o /dev/null --max-time 15 \
  -X OPTIONS "https://${API_HOST}/api/status" \
  -H "Origin: ${FRONTEND_ORIGIN}" \
  -H "Access-Control-Request-Method: GET" \
  -H "Access-Control-Request-Headers: authorization,content-type,x-auth-session")"
acao="$(printf '%s' "$headers" | grep -i '^access-control-allow-origin:' | tr -d '\r')"
acc="$(printf '%s' "$headers" | grep -i '^access-control-allow-credentials:' | tr -d '\r')"
if echo "$acao" | grep -q "${FRONTEND_ORIGIN}"; then
  pass "CORS origin CLB"
else
  bad "CORS origin CLB missing ${FRONTEND_ORIGIN} (got: $acao)"
fi
if echo "$acc" | grep -qi 'true'; then
  pass "CORS credentials CLB"
else
  bad "CORS credentials CLB (got: $acc)"
fi
headers_bad="$(curl -sS -D - -o /dev/null --max-time 15 \
  -X OPTIONS "https://${API_HOST}/api/status" \
  -H "Origin: https://evil.example" \
  -H "Access-Control-Request-Method: GET")"
acao_bad="$(printf '%s' "$headers_bad" | grep -i '^access-control-allow-origin:' | tr -d '\r' || true)"
if echo "$acao_bad" | grep -q 'evil.example'; then
  bad "CORS reflected unlisted origin on CLB"
else
  pass "CORS unlisted origin rejected on CLB"
fi

if [ -n "${TEST_API_KEY:-}" ]; then
  echo "== relay auth on Run CLB =="
  code="$(curl_url "https://${RUN_HOST}/v1/models" -H "Authorization: Bearer ${TEST_API_KEY}")"
  if [ "$code" = "200" ]; then
    pass "GET /v1/models Run CLB"
  else
    bad "GET /v1/models Run CLB status=$code body=$(head -c 200 /tmp/prod-launch-body)"
  fi
  code_bad="$(curl_url "https://${RUN_HOST}/v1/models" -H "Authorization: Bearer sk-invalid-launch-test")"
  if [ "$code_bad" = "401" ] || [ "$code_bad" = "403" ]; then
    pass "invalid key rejected Run CLB ($code_bad)"
  else
    bad "invalid key Run CLB status=$code_bad"
  fi
else
  echo "SKIP relay auth smoke (TEST_API_KEY unset)"
fi

if [ "$DIRECT_NODE_SMOKE" = "1" ]; then
  echo "== direct node probes (diagnostic only; not a production-entry pass) =="
  for spec in $API_NODES $RUN_NODES; do
    IFS='|' read -r _kind sni ip <<<"$spec"
    code="$(curl_node "$sni" "$ip" "/healthz" -H 'Accept: application/json')"
    if [ "$code" = "200" ]; then
      pass "direct healthz $sni@$ip"
    else
      bad "direct healthz $sni@$ip status=$code"
    fi
  done
else
  echo "SKIP direct node probes (set DIRECT_NODE_SMOKE=1 for diagnostics)"
fi

echo
if [ "$fail" -ne 0 ]; then
  echo "smoke failed"
  exit 1
fi
echo "smoke passed (CLB production entry)"
