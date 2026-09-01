#!/bin/bash
# Zero-502 rolling deploy for one node, maintenance-flag based. Run as root on
# the TARGET node. Normally invoked by the central rollout entry
# (scripts/release/rollout.sh on the development host), which holds a
# cluster-wide release lock; direct invocation is allowed for single-node
# recovery but never operate two nodes of one service at the same time.
#
# Flow:
#   release lease + node-local lock
#   -> public entry healthy
#   -> maintenance ON (nginx /readyz=503, app still serving business paths)
#   -> peer gate: public entry recovers to 200 (CLB failover absorbed)
#   -> ACTIVE detach proof: unique read-only probes through the public entry,
#      ZERO must hit this node; repeated after a full health-threshold window
#   -> drain in-flight requests (RUN SSE >= 120s)
#   -> deploy.sh (failure keeps the node OUT of the pool)
#   -> local probe gate + post-deploy observation window
#   -> maintenance OFF, nginx /readyz=200
#   -> rejoin stability window (traffic returns, probes stay 200)
#
# Signals: before deploy, SIGINT/SIGTERM/EXIT restore service (flag removed);
# after deploy starts, the node stays offline on any failure so a broken
# version can never rejoin on its own.
#
# Usage:
#   FLUXLANE_ROLLOUT_ID=<release-or-run-id> rolling.sh <api|run> <tag> <public-base> [public-host-header]
# Example:
#   FLUXLANE_ROLLOUT_ID=prod-20260831-2612f77-run2 rolling.sh run prod-20260831-2612f77 https://run.fluxlane.ai run.fluxlane.ai
set -euo pipefail

ROLE=${1:-}; TAG=${2:-}; PUBLIC_BASE=${3:-}; PUBLIC_HOST=${4:-}
ROLLLOUT_ID=${FLUXLANE_ROLLOUT_ID:-manual-$(date -u +%Y%m%dT%H%M%SZ)}
DEPLOY_ROOT=/opt/fluxlane/deploy
FLAG=/var/run/fluxlane-maintenance
ACCESS_LOG=/var/log/nginx/access.log
LEASE_FILE=/opt/fluxlane/deploy/.active-rollout
LOCK_FILE=/opt/fluxlane/deploy/.rolling.lock
PROBE_COUNT=30            # unique read-only probes per detach-proof round
PROBE_ROUNDS=2            # repeated after a full health-threshold window
THRESHOLD_WINDOW=35       # >= one CLB unhealth threshold cycle (observed ~10-30s)
DRAIN_SECONDS=120         # RUN SSE drain; overridden to 10 for api
QUIET_SECONDS=30          # access log quiet on top of the active probes
OBSERVE_SECONDS=60        # post-deploy stability window before rejoin
REJOIN_TIMEOUT=240        # max wait for traffic to return after flag removal

[ "$ROLE" = api ] || [ "$ROLE" = run ] || { echo "usage: rolling.sh <api|run> <tag> <public-base> [host-header]" >&2; exit 2; }
[ -n "$TAG" ] && [ -n "$PUBLIC_BASE" ] || { echo "usage: rolling.sh <api|run> <tag> <public-base> [host-header]" >&2; exit 2; }
if [ "$ROLE" = api ]; then DRAIN_SECONDS=10; fi

say() { printf 'rolling: %s\n' "$*"; }
STAGE=predeploy
restore_and_abort() {
  local msg=$1
  if [ "$STAGE" = predeploy ]; then
    rm -f "$FLAG"
    rm -f "$LEASE_FILE" 2>/dev/null || true
    say "restored service and ABORTED: $msg"
  else
    say "ABORTED, node kept OUT of pool (flag $FLAG present): $msg"
    say "rollback: FLUXLANE_CLB_DETACHED=yes $DEPLOY_ROOT/$ROLE/rollback.sh <previous-tag>"
  fi
  exit 1
}
on_signal() {
  if [ "$STAGE" = rejoin ]; then
    # Already back in the pool; nothing to restore or take offline.
    say "signal at stage=rejoin ignored (node is already rejoined; rollout continues or ends here)"
    exit 0
  fi
  restore_and_abort "received signal at stage=$STAGE"
}
trap 'on_signal INT' INT
trap 'on_signal TERM' TERM
trap 'on_signal HUP' HUP

# --- release lease + node-local lock --------------------------------------
# The central rollout entry (cluster-wide flock) passes FLUXLANE_ROLLOUT_ID;
# the lease file prevents a second concurrent rollout from touching a node
# that is mid-roll, even if the central lock was bypassed.
exec 9>"$LOCK_FILE"
flock -n 9 || { echo "rolling: another rolling deploy holds $LOCK_FILE" >&2; exit 1; }
if [ -f "$LEASE_FILE" ] && grep -qv '^'"$ROLLLOUT_ID"'$' "$LEASE_FILE"; then
  say "lease held by $(cat "$LEASE_FILE"); refusing"
  exit 1
fi
printf '%s\n' "$ROLLLOUT_ID" > "$LEASE_FILE"

# No curl -f anywhere: a 401 from the unauthenticated run probe is the
# EXPECTED healthy answer and must not be treated as a transport failure.
# Unique query param + no-cache headers guarantee each request really
# traverses the CLB and is individually matchable in the default combined
# access log (which does not record a custom User-Agent reliably).
probe_public() {
  curl -sk -o /dev/null -w '%{http_code}' --max-time 8 \
    -H 'Cache-Control: no-cache' -H 'Pragma: no-cache' \
    ${PUBLIC_HOST:+-H "Host: $PUBLIC_HOST"} "$1"
}

# Unique read-only probe through the public entry. api uses /api/status
# (200, read-only); run uses /v1/models without a token (expected 401, no
# Provider/Usage/Billing side effects). Both carry a unique query marker that
# lands in this node's access log iff the CLB still routes to it.
probe_marker="fluxlane-rollout-$RANDOM$RANDOM"
send_probes() {
  local i code
  if [ "$ROLE" = api ]; then
    local path="/api/status"
  else
    local path="/v1/models"
  fi
  for i in $(seq 1 "$PROBE_COUNT"); do
    code=$(probe_public "$PUBLIC_BASE$path?rollout_probe=$probe_marker-$i")
    case "$code" in 200|401) ;; *) say "WARNING probe $i returned $code" ;; esac
    sleep 0.3
  done
}
local_probe_hits() { grep -c "$probe_marker" "$ACCESS_LOG" 2>/dev/null || true; }

# --- 1. public entry must be healthy before we touch anything --------------
c=$(probe_public "$PUBLIC_BASE/readyz"); [ "$c" = 200 ] || restore_and_abort "public entry $PUBLIC_BASE/readyz returned $c before start"

# --- 2. maintenance ON ------------------------------------------------------
touch "$FLAG"
sleep 1
c=$(curl -sk -o /dev/null -w '%{http_code}' https://127.0.0.1/readyz -H 'Host: localhost')
[ "$c" = 503 ] || restore_and_abort "maintenance flag did not produce 503 (got $c)"
app=$(curl -s -o /dev/null -w '%{http_code}' --max-time 5 http://127.0.0.1:3000/readyz)
[ "$app" = 200 ] || restore_and_abort "app itself unhealthy during maintenance ($app)"
say "maintenance ON: nginx /readyz=503, app /readyz=200"

# --- 3. peer gate: public entry recovers (CLB failover window absorbed) -----
gate_ok=0; gate_waited=0; last=000
while [ "$gate_waited" -lt 120 ]; do
  sleep 5; gate_waited=$((gate_waited+5))
  c=$(probe_public "$PUBLIC_BASE/readyz"); last=$c
  if [ "$c" = 200 ]; then
    sleep 3
    c=$(probe_public "$PUBLIC_BASE/readyz")
    if [ "$c" = 200 ]; then gate_ok=1; break; fi
  fi
done
[ "$gate_ok" = 1 ] || restore_and_abort "public entry never recovered to 200 (last=$last) — peer not carrying"
say "peer healthy via public entry: $PUBLIC_BASE"

# --- 4. ACTIVE detach proof + natural-traffic quiet -------------------------
# Passive log silence proves nothing at low traffic, so we generate our own
# read-only probe traffic through the CLB and require zero hits locally,
# twice, separated by a full health-threshold window.
round=1
while [ "$round" -le "$PROBE_ROUNDS" ]; do
  send_probes
  sleep 2
  hits=$(local_probe_hits)
  [ "$hits" = 0 ] || restore_and_abort "detach proof round $round: $hits/$PROBE_COUNT probes still hit this node — CLB still forwarding"
  say "detach proof round $round: 0/$PROBE_COUNT probes hit this node"
  [ "$round" -lt "$PROBE_ROUNDS" ] && { say "waiting one threshold window (${THRESHOLD_WINDOW}s)"; sleep "$THRESHOLD_WINDOW"; }
  round=$((round+1))
done

# Natural business traffic must also be quiet.
say "confirming access log quiet for ${QUIET_SECONDS}s"
prev=$(wc -l < "$ACCESS_LOG"); quiet=0; waited=0
while [ "$waited" -lt 120 ]; do
  sleep 5; waited=$((waited+5))
  cur=$(wc -l < "$ACCESS_LOG")
  if [ "$cur" = "$prev" ]; then quiet=$((quiet+5)); else quiet=0; prev=$cur; fi
  [ "$quiet" -ge "$QUIET_SECONDS" ] && break
done
[ "$quiet" -ge "$QUIET_SECONDS" ] || restore_and_abort "business traffic still arriving after 120s"

# --- 5. drain in-flight (SSE) requests --------------------------------------
say "draining ${DRAIN_SECONDS}s"
sleep "$DRAIN_SECONDS"

# --- 6. deploy; failure keeps the node offline -------------------------------
STAGE=deploy
if ! FLUXLANE_CLB_DETACHED=yes "$DEPLOY_ROOT/$ROLE/deploy.sh" "$TAG"; then
  restore_and_abort "deploy.sh failed"
fi

# --- 7. local probe gate + observation window ---------------------------------
sleep 2
for path in /healthz /readyz; do
  c=$(curl -s -o /dev/null -w '%{http_code}' --max-time 5 "http://127.0.0.1:3000$path")
  [ "$c" = 200 ] || restore_and_abort "post-deploy probe $path=$c"
done
say "post-deploy app probes OK; observing ${OBSERVE_SECONDS}s"
sleep "$OBSERVE_SECONDS"
for path in /healthz /readyz; do
  c=$(curl -s -o /dev/null -w '%{http_code}' --max-time 5 "http://127.0.0.1:3000$path")
  [ "$c" = 200 ] || restore_and_abort "probe $path=$c during observation window"
done
restarts=$(docker inspect --format '{{.RestartCount}}' "${FLUXLANE_CONTAINER_NAME:-$([ "$ROLE" = api ] && echo fluxlane-api || echo new-api)}")
oom=$(docker inspect --format '{{.State.OOMKilled}}' "${FLUXLANE_CONTAINER_NAME:-$([ "$ROLE" = api ] && echo fluxlane-api || echo new-api)}")
[ "$restarts" = 0 ] || restore_and_abort "container restarted ($restarts) during observation"
[ "$oom" = false ] || restore_and_abort "container OOM killed during observation"
say "observation window clean (restarts=0, oom=false, probes 200)"

# --- 8. rejoin -----------------------------------------------------------------
STAGE=rejoin
rm -f "$FLAG" "$LEASE_FILE"
sleep 1
c=$(curl -sk -o /dev/null -w '%{http_code}' https://127.0.0.1/readyz -H 'Host: localhost')
[ "$c" = 200 ] || { touch "$FLAG"; printf '%s\n' "$ROLLLOUT_ID" > "$LEASE_FILE"; restore_and_abort "nginx /readyz=$c after removing flag; flag restored"; }
say "maintenance OFF: nginx /readyz=200"

# --- 9. rejoin stability: traffic must return and probes must hold -------------
base=$(wc -l < "$ACCESS_LOG"); rejoined=0; waited=0
while [ "$waited" -lt "$REJOIN_TIMEOUT" ]; do
  sleep 5; waited=$((waited+5))
  if [ "$(wc -l < "$ACCESS_LOG")" -gt "$base" ]; then rejoined=1; break; fi
done
if [ "$rejoined" = 1 ]; then
  sleep 60
  c=$(curl -sk -o /dev/null -w '%{http_code}' https://127.0.0.1/readyz -H 'Host: localhost')
  [ "$c" = 200 ] || say "WARNING nginx /readyz=$c 60s after traffic resumed"
  say "traffic resumed and stable; roll complete"
else
  say "WARNING no traffic observed within ${REJOIN_TIMEOUT}s (quiet service?); verify CLB health status manually"
fi
