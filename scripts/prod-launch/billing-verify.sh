#!/usr/bin/env bash
# Snapshot token quota, send one (or N) chat completions, wait for settle, compare.
set -euo pipefail

ROOT="$(cd "$(dirname "$0")" && pwd)"
# shellcheck disable=SC1091
[ -f "$ROOT/.env" ] && . "$ROOT/.env"

API_BASE="${API_BASE:-https://api.fluxlane.ai}"
RUN_BASE="${RUN_BASE:-https://run.fluxlane.ai}"
API_HOST="${API_HOST:-api.fluxlane.ai}"
RUN_HOST="${RUN_HOST:-run.fluxlane.ai}"
TEST_MODEL="${TEST_MODEL:-gpt-4o-mini}"
SETTLE_WAIT_SECONDS="${SETTLE_WAIT_SECONDS:-8}"
STREAM=false
EXPECT_REQUESTS=1
PROMPT="Reply with the single word pong."

usage() {
  cat <<EOF
Usage: $0 [--stream] [--expect-requests N] [--prompt TEXT]
Requires TEST_API_KEY in .env. Optional DASHBOARD_ACCESS_TOKEN for log lookup.
EOF
}

while [ $# -gt 0 ]; do
  case "$1" in
    --stream) STREAM=true; shift ;;
    --expect-requests) EXPECT_REQUESTS="$2"; shift 2 ;;
    --prompt) PROMPT="$2"; shift 2 ;;
    -h|--help) usage; exit 0 ;;
    *) echo "unknown arg: $1" >&2; usage; exit 2 ;;
  esac
done

if [ -z "${TEST_API_KEY:-}" ]; then
  echo "TEST_API_KEY is required" >&2
  exit 2
fi

resolve_args=()
if [ -n "${API_RESOLVE:-}" ]; then
  resolve_args+=(--resolve "${API_HOST}:443:${API_RESOLVE}")
fi
run_resolve_args=()
if [ -n "${RUN_RESOLVE:-}" ]; then
  run_resolve_args+=(--resolve "${RUN_HOST}:443:${RUN_RESOLVE}")
fi

usage_snapshot() {
  curl -fsS "${resolve_args[@]}" \
    -H "Authorization: Bearer ${TEST_API_KEY}" \
    "${API_BASE}/api/usage/token/"
}

read_available() {
  jq -r '.data.total_available // .data.remain_quota // empty'
}

read_used() {
  jq -r '.data.total_used // .data.used_quota // empty'
}

before="$(usage_snapshot)"
avail_before="$(printf '%s' "$before" | read_available)"
used_before="$(printf '%s' "$before" | read_used)"
if [ -z "$avail_before" ]; then
  echo "could not parse token usage: $before" >&2
  exit 1
fi

echo "before remain=${avail_before} used=${used_before}"

stream_json=false
[ "$STREAM" = true ] && stream_json=true

body="$(jq -n \
  --arg model "$TEST_MODEL" \
  --arg prompt "$PROMPT" \
  --argjson stream "$stream_json" \
  '{model:$model,stream:$stream,max_tokens:16,messages:[{role:"user",content:$prompt}]}')"

request_ids=()
ok=0
fail_http=0
i=0
while [ "$i" -lt "$EXPECT_REQUESTS" ]; do
  tmp_hdr="$(mktemp)"
  tmp_body="$(mktemp)"
  code="$(curl -sS "${run_resolve_args[@]}" \
    -D "$tmp_hdr" -o "$tmp_body" --write-out '%{http_code}' \
    --max-time 120 \
    -H "Authorization: Bearer ${TEST_API_KEY}" \
    -H "Content-Type: application/json" \
    -d "$body" \
    "${RUN_BASE}/v1/chat/completions")"
  rid="$(grep -i '^x-oneapi-request-id:' "$tmp_hdr" | awk '{print $2}' | tr -d '\r' || true)"
  request_ids+=("$rid")
  if [ "$code" = "200" ]; then
    ok=$((ok + 1))
    echo "ok  request $((i+1)) id=${rid:-?} usage=$(jq -c '.usage // {}' "$tmp_body" 2>/dev/null || echo '{}')"
  else
    fail_http=$((fail_http + 1))
    echo "err request $((i+1)) status=$code id=${rid:-?} body=$(head -c 300 "$tmp_body")"
  fi
  rm -f "$tmp_hdr" "$tmp_body"
  i=$((i + 1))
done

echo "waiting ${SETTLE_WAIT_SECONDS}s for settle / batch update..."
sleep "$SETTLE_WAIT_SECONDS"

after="$(usage_snapshot)"
avail_after="$(printf '%s' "$after" | read_available)"
used_after="$(printf '%s' "$after" | read_used)"
delta_remain=$((avail_before - avail_after))
delta_used=$((used_after - used_before))

echo "after  remain=${avail_after} used=${used_after}"
echo "delta  remain_drop=${delta_remain} used_rise=${delta_used} http_ok=${ok} http_fail=${fail_http}"

if [ "$avail_after" -lt 0 ]; then
  echo "FAIL token remain went negative: ${avail_after}" >&2
  exit 1
fi

if [ "$delta_remain" -ne "$delta_used" ]; then
  echo "FAIL remain drop (${delta_remain}) != used rise (${delta_used})" >&2
  exit 1
fi

if [ "$ok" -eq 0 ]; then
  if [ "$delta_remain" -ne 0 ]; then
    echo "FAIL all requests failed but quota changed by ${delta_remain}" >&2
    exit 1
  fi
  echo "FAIL no successful chat completions" >&2
  exit 1
fi

if [ "$fail_http" -gt 0 ] && [ "$delta_remain" -lt 0 ]; then
  echo "FAIL quota increased after mixed failures (possible over-refund)" >&2
  exit 1
fi

if [ -n "${DASHBOARD_ACCESS_TOKEN:-}" ]; then
  log_quota_sum=0
  for rid in "${request_ids[@]}"; do
    [ -z "$rid" ] && continue
    log_json="$(curl -fsS "${resolve_args[@]}" \
      -H "Authorization: Bearer ${DASHBOARD_ACCESS_TOKEN}" \
      "${API_BASE}/api/log/self?type=2&request_id=${rid}")"
    q="$(printf '%s' "$log_json" | jq '[.data.items[]? // .data[]? | .quota // 0] | add // 0')"
    echo "log  request_id=${rid} quota=${q}"
    log_quota_sum=$((log_quota_sum + q))
  done
  echo "log  summed_quota=${log_quota_sum}"
  if [ "$log_quota_sum" -ne "$delta_remain" ]; then
    echo "FAIL log quota sum (${log_quota_sum}) != remain drop (${delta_remain}). If BATCH_UPDATE is on, increase SETTLE_WAIT_SECONDS." >&2
    exit 1
  fi
else
  echo "SKIP log cross-check (DASHBOARD_ACCESS_TOKEN unset); remain/used still matched"
fi

echo "billing verify passed"
