#!/usr/bin/env bash
# Probe health, readiness, API-only mode, TLS, and CORS on every API/Run node.
set -euo pipefail

ROOT="$(cd "$(dirname "$0")" && pwd)"
# shellcheck disable=SC1091
[ -f "$ROOT/.env" ] && . "$ROOT/.env"

API_HOST="${API_HOST:-api.fluxlane.ai}"
RUN_HOST="${RUN_HOST:-run.fluxlane.ai}"
FRONTEND_ORIGIN="${FRONTEND_ORIGIN:-https://www.fluxlane.ai}"
API_NODES="${API_NODES:-api|${API_HOST}|124.156.104.48 api|${API_HOST}|43.154.68.173}"
RUN_NODES="${RUN_NODES:-run|${RUN_HOST}|43.154.184.164 run|${RUN_HOST}|150.109.45.79}"

fail=0
pass() { printf 'PASS  %s\n' "$1"; }
bad()  { printf 'FAIL  %s\n' "$1"; fail=1; }

curl_node() {
  local sni="$1" ip="$2" path="$3"
  shift 3
  curl -sS -o /tmp/prod-launch-body --write-out '%{http_code}' \
    --max-time 15 \
    --resolve "${sni}:443:${ip}" \
    "$@" \
    "https://${sni}${path}"
}

check_json_status() {
  local label="$1" sni="$2" ip="$3" path="$4" want="$5"
  local code
  code="$(curl_node "$sni" "$ip" "$path" -H 'Accept: application/json')"
  if [ "$code" != "$want" ]; then
    bad "$label $sni@$ip $path status=$code want=$want body=$(head -c 200 /tmp/prod-launch-body)"
    return
  fi
  pass "$label $sni@$ip $path ($code)"
}

echo "== health / ready / status =="
for spec in $API_NODES $RUN_NODES; do
  IFS='|' read -r _kind sni ip <<<"$spec"
  check_json_status "healthz" "$sni" "$ip" "/healthz" "200"
  check_json_status "readyz"  "$sni" "$ip" "/readyz"  "200"
done

echo "== /api/status payload =="
for spec in $API_NODES $RUN_NODES; do
  IFS='|' read -r _kind sni ip <<<"$spec"
  code="$(curl_node "$sni" "$ip" "/api/status")"
  if [ "$code" != "200" ] || ! grep -q '"success":true\|"success": true' /tmp/prod-launch-body; then
    bad "api status payload $sni@$ip"
  else
    pass "api status payload $sni@$ip"
  fi
done

echo "== SERVE_FRONTEND=false (API nodes must not serve the dashboard HTML) =="
for spec in $API_NODES; do
  IFS='|' read -r _kind sni ip <<<"$spec"
  code="$(curl_node "$sni" "$ip" "/" -H 'Accept: text/html,application/json')"
  body="$(cat /tmp/prod-launch-body)"
  if echo "$body" | grep -qi '<html'; then
    bad "API $sni@$ip GET / returned HTML (SERVE_FRONTEND should be false)"
  elif [ "$code" = "404" ] && echo "$body" | grep -q 'route not found'; then
    pass "API $sni@$ip GET / is JSON 404"
  else
    # Some nginx configs proxy only /api|/v1; a non-HTML 404 is still acceptable.
    if echo "$body" | grep -qi '<html'; then
      bad "API $sni@$ip GET / unexpected HTML ($code)"
    else
      pass "API $sni@$ip GET / non-HTML ($code)"
    fi
  fi
done

echo "== CORS allowlist =="
for spec in $API_NODES; do
  IFS='|' read -r _kind sni ip <<<"$spec"
  headers="$(curl -sS -D - -o /dev/null --max-time 15 \
    --resolve "${sni}:443:${ip}" \
    -X OPTIONS "https://${sni}/api/status" \
    -H "Origin: ${FRONTEND_ORIGIN}" \
    -H "Access-Control-Request-Method: GET" \
    -H "Access-Control-Request-Headers: authorization,content-type,x-auth-session")"
  acao="$(printf '%s' "$headers" | grep -i '^access-control-allow-origin:' | tr -d '\r')"
  acc="$(printf '%s' "$headers" | grep -i '^access-control-allow-credentials:' | tr -d '\r')"
  if echo "$acao" | grep -q "${FRONTEND_ORIGIN}"; then
    pass "CORS origin $sni@$ip"
  else
    bad "CORS origin $sni@$ip missing ${FRONTEND_ORIGIN} (got: $acao)"
  fi
  if echo "$acc" | grep -qi 'true'; then
    pass "CORS credentials $sni@$ip"
  else
    bad "CORS credentials $sni@$ip (got: $acc)"
  fi

  headers_bad="$(curl -sS -D - -o /dev/null --max-time 15 \
    --resolve "${sni}:443:${ip}" \
    -X OPTIONS "https://${sni}/api/status" \
    -H "Origin: https://evil.example" \
    -H "Access-Control-Request-Method: GET")"
  acao_bad="$(printf '%s' "$headers_bad" | grep -i '^access-control-allow-origin:' | tr -d '\r' || true)"
  if echo "$acao_bad" | grep -q 'evil.example'; then
    bad "CORS reflected unlisted origin on $sni@$ip"
  else
    pass "CORS unlisted origin rejected $sni@$ip"
  fi
done

if [ -n "${TEST_API_KEY:-}" ]; then
  echo "== relay auth smoke on Run nodes =="
  for spec in $RUN_NODES; do
    IFS='|' read -r _kind sni ip <<<"$spec"
    code="$(curl_node "$sni" "$ip" "/v1/models" \
      -H "Authorization: Bearer ${TEST_API_KEY}")"
    if [ "$code" = "200" ]; then
      pass "GET /v1/models $sni@$ip"
    else
      bad "GET /v1/models $sni@$ip status=$code body=$(head -c 200 /tmp/prod-launch-body)"
    fi
    code_bad="$(curl_node "$sni" "$ip" "/v1/models" \
      -H "Authorization: Bearer sk-invalid-launch-test")"
    if [ "$code_bad" = "401" ] || [ "$code_bad" = "403" ]; then
      pass "invalid key rejected $sni@$ip ($code_bad)"
    else
      bad "invalid key $sni@$ip status=$code_bad"
    fi
  done
else
  echo "SKIP relay auth smoke (TEST_API_KEY unset)"
fi

echo
if [ "$fail" -ne 0 ]; then
  echo "smoke failed"
  exit 1
fi
echo "smoke passed"
