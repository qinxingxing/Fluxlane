#!/usr/bin/env bash
# B17: balance covers N requests; fire TOTAL >> N through Run CLB.
# Must NOT pin TARGET_HOST / --resolve to a single RUN node.
set -euo pipefail

ROOT="$(cd "$(dirname "$0")" && pwd)"
# shellcheck disable=SC1091
[ -f "$ROOT/.env" ] && . "$ROOT/.env"

API_BASE="${API_BASE:-https://api.fluxlane.ai}"
RUN_BASE="${RUN_BASE:-https://run.fluxlane.ai}"
TEST_MODEL="${TEST_MODEL:-gpt-4o-mini}"
SETTLE_WAIT_SECONDS="${SETTLE_WAIT_SECONDS:-8}"
TRUST_QUOTA="${TRUST_QUOTA:-5000000}"
ALLOWED=5
TOTAL=20
PROMPT="Reply with the single word pong."

usage() {
  cat <<EOF
Usage: $0 [--allowed N] [--total M] [--quota-per-request Q]
Hits ${RUN_BASE} (CLB). Set token remain ≈ N*Q and below ${TRUST_QUOTA} first.
EOF
}

while [ $# -gt 0 ]; do
  case "$1" in
    --allowed) ALLOWED="$2"; shift 2 ;;
    --total) TOTAL="$2"; shift 2 ;;
    --quota-per-request) QUOTA_PER_REQUEST="$2"; shift 2 ;;
    --prompt) PROMPT="$2"; shift 2 ;;
    -h|--help) usage; exit 0 ;;
    *) echo "unknown arg: $1" >&2; usage; exit 2 ;;
  esac
done

if [ -z "${TEST_API_KEY:-}" ]; then
  echo "TEST_API_KEY is required" >&2
  exit 2
fi
if [ "$TOTAL" -le "$ALLOWED" ]; then
  echo "total ($TOTAL) must be greater than allowed ($ALLOWED)" >&2
  exit 2
fi

usage_snapshot() {
  curl -fsS -H "Authorization: Bearer ${TEST_API_KEY}" \
    "${API_BASE}/api/usage/token/"
}

before="$(usage_snapshot)"
avail_before="$(printf '%s' "$before" | jq -r '.data.total_available')"
used_before="$(printf '%s' "$before" | jq -r '.data.total_used')"
if [ -z "$avail_before" ] || [ "$avail_before" = "null" ]; then
  echo "could not parse token usage: $before" >&2
  exit 1
fi

if [ "$avail_before" -ge "$TRUST_QUOTA" ]; then
  echo "FAIL remain=${avail_before} >= trust quota ${TRUST_QUOTA}; shouldTrust would skip pre-consume" >&2
  exit 1
fi

if [ -n "${QUOTA_PER_REQUEST:-}" ]; then
  need=$((ALLOWED * QUOTA_PER_REQUEST))
  if [ "$avail_before" -gt $((need + QUOTA_PER_REQUEST)) ]; then
    echo "FAIL remain=${avail_before} is enough for more than ${ALLOWED} requests (need≈${need}). Lower token remain first." >&2
    exit 1
  fi
  if [ "$avail_before" -lt "$QUOTA_PER_REQUEST" ]; then
    echo "FAIL remain=${avail_before} cannot cover even 1 request of ${QUOTA_PER_REQUEST}" >&2
    exit 1
  fi
fi

echo "before remain=${avail_before} used=${used_before} allowed=${ALLOWED} total=${TOTAL}"
echo "sending ${TOTAL} parallel requests to ${RUN_BASE} (CLB)"

body="$(jq -n \
  --arg model "$TEST_MODEL" \
  --arg prompt "$PROMPT" \
  '{model:$model,stream:false,max_tokens:8,messages:[{role:"user",content:$prompt}]}')"

workdir="$(mktemp -d)"
trap 'rm -rf "$workdir"' EXIT

i=0
while [ "$i" -lt "$TOTAL" ]; do
  (
    curl -sS -D "${workdir}/${i}.hdr" -o "${workdir}/${i}.body" --write-out '%{http_code}' \
      --max-time 120 \
      -H "Authorization: Bearer ${TEST_API_KEY}" \
      -H "Content-Type: application/json" \
      -d "$body" \
      "${RUN_BASE}/v1/chat/completions" > "${workdir}/${i}.code"
  ) &
  i=$((i + 1))
done
wait

ok=0
denied=0
other=0
i=0
while [ "$i" -lt "$TOTAL" ]; do
  code="$(cat "${workdir}/${i}.code")"
  rid="$(grep -i '^x-oneapi-request-id:' "${workdir}/${i}.hdr" 2>/dev/null | awk '{print $2}' | tr -d '\r' || true)"
  case "$code" in
    200) ok=$((ok + 1)); echo "ok  #$i id=${rid:-?} code=200" ;;
    403) denied=$((denied + 1)); echo "deny #$i id=${rid:-?} code=403" ;;
    *) other=$((other + 1)); echo "other #$i id=${rid:-?} code=$code body=$(head -c 160 "${workdir}/${i}.body")" ;;
  esac
  i=$((i + 1))
done

echo "waiting ${SETTLE_WAIT_SECONDS}s for settle / batch update..."
sleep "$SETTLE_WAIT_SECONDS"

after="$(usage_snapshot)"
avail_after="$(printf '%s' "$after" | jq -r '.data.total_available')"
used_after="$(printf '%s' "$after" | jq -r '.data.total_used')"
delta_remain=$((avail_before - avail_after))

echo "after  remain=${avail_after} used=${used_after} remain_drop=${delta_remain}"
echo "counts http_200=${ok} http_403=${denied} other=${other}"

fail=0
if [ "$ok" -gt "$ALLOWED" ]; then
  echo "FAIL Provider-proxy HTTP 200 (${ok}) > allowed (${ALLOWED})"
  fail=1
fi
if [ "$avail_after" -lt 0 ]; then
  echo "FAIL token remain penetrated to ${avail_after}"
  fail=1
fi
if [ "$ok" -eq "$TOTAL" ]; then
  echo "FAIL every request succeeded; pre-consume did not bound concurrency"
  fail=1
fi
if [ "$ok" -eq 0 ]; then
  echo "FAIL no successful request; remaining ${avail_before} may be below one request cost"
  fail=1
fi
if [ -n "${QUOTA_PER_REQUEST:-}" ]; then
  max_drop=$((ok * QUOTA_PER_REQUEST * 2))
  if [ "$delta_remain" -gt "$max_drop" ]; then
    echo "FAIL remain drop ${delta_remain} exceeds 2x successful pre-consume bound ${max_drop} (possible leftover reservation)"
    fail=1
  fi
fi

if [ -n "${DASHBOARD_ACCESS_TOKEN:-}" ]; then
  user_json="$(curl -fsS -H "Authorization: Bearer ${DASHBOARD_ACCESS_TOKEN}" \
    "${API_BASE}/api/user/self")"
  user_quota="$(printf '%s' "$user_json" | jq -r '.data.quota')"
  echo "user  quota=${user_quota}"
  if [ "$user_quota" -lt 0 ]; then
    echo "FAIL user quota penetrated to ${user_quota}"
    fail=1
  fi
fi

if [ "$fail" -ne 0 ]; then
  echo "underfunded burst failed"
  exit 1
fi
echo "underfunded burst passed: http_200=${ok} <= allowed=${ALLOWED}, remain=${avail_after} >= 0"
