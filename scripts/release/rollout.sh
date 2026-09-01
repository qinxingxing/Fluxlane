#!/bin/bash
# Central production rollout entry, run on the development host.
#
# Two subcommands with deliberately separate semantics:
#
#   rollout.sh sync-assets <node>...
#       ONLY copies deploy assets from the current clean Git commit to the
#       nodes and verifies sha256 equality. Never deploys anything; a tag is
#       not even accepted.
#
#   rollout.sh deploy <tag> <node>...
#       Holds ONE cluster-wide lock for the whole api-1 -> api-2 -> run-1 ->
#       run-2 run (lock is released only when the script exits), refuses
#       nodes whose assets drifted from the Git commit, then per node invokes
#       the node-side rolling.sh (maintenance soft detach, active detach
#       proof, drain, deploy, probe gates, rejoin) with a rollout lease id.
#
# Usage:
#   rollout.sh sync-assets api-1 api-2 run-1 run-2
#   rollout.sh deploy prod-YYYYMMDD-<short-sha> api-1 api-2 run-1 run-2
#   rollout.sh --list
# Environment:
#   FLUXLANE_REPO_DIR (default /home/codex/workspace/Fluxlane)
#   SSH key: /home/codex/.ssh/id_ed25519, user ubuntu, sudo on nodes
set -euo pipefail

REPO_DIR=${FLUXLANE_REPO_DIR:-/home/codex/workspace/Fluxlane}
SSH_KEY=/home/codex/.ssh/id_ed25519
LOCK_FILE=${FLUXLANE_RELEASE_ROOT:-/home/codex/releases}/.fluxlane-production-release.lock
ASSETS=(deploy/common/rolling.sh deploy/common/node-lib.sh deploy/common/nginx-maintenance-install.sh deploy/api/deploy.sh deploy/api/rollback.sh deploy/api/docker-compose.yml deploy/api/nginx.conf deploy/run/deploy.sh deploy/run/rollback.sh deploy/run/docker-compose.yml deploy/run/nginx.conf)

say() { printf 'rollout: %s\n' "$*"; }
die() { printf 'rollout: %s\n' "$*" >&2; exit 1; }

node_meta() {
  case $1 in
    api-1) echo "api 124.156.104.48 https://api.fluxlane.ai api.fluxlane.ai" ;;
    api-2) echo "api 43.154.68.173 https://api.fluxlane.ai api.fluxlane.ai" ;;
    run-1) echo "run 43.154.184.164 https://run.fluxlane.ai run.fluxlane.ai" ;;
    run-2) echo "run 150.109.45.79 https://run.fluxlane.ai run.fluxlane.ai" ;;
    *) return 1 ;;
  esac
}

if [ "${1:-}" = "--list" ]; then
  cat <<'EOF'
api-1  api  124.156.104.48  https://api.fluxlane.ai
api-2  api  43.154.68.173  https://api.fluxlane.ai
run-1  run  43.154.184.164  https://run.fluxlane.ai
run-2  run  150.109.45.79   https://run.fluxlane.ai
EOF
  exit 0
fi

MODE=${1:-}; shift || true
[ "$MODE" = sync-assets ] || [ "$MODE" = deploy ] || die "usage: rollout.sh {sync-assets|deploy} [<tag>] <node>... (see --list)"

TAG=""
if [ "$MODE" = deploy ]; then
  TAG=${1:-}; shift || true
  [[ $TAG =~ ^prod-[0-9]{8}-[0-9a-f]{7,40}$ ]] || die "deploy needs a prod-YYYYMMDD-<short-sha> tag"
fi
[ $# -ge 1 ] || die "no nodes given (see rollout.sh --list)"
command -v flock >/dev/null || die "flock is required"

cd "$REPO_DIR"
[ -d .git ] || die "no git repository at $REPO_DIR"
# Assets must come from a clean tree of a real commit, never local edits.
[ -z "$(git status --porcelain -- "${ASSETS[@]}")" ] || die "deploy assets have uncommitted local changes; commit or stash first"
COMMIT=$(git rev-parse HEAD)

ssh_node() {
  local host=$1; shift
  ssh -i "$SSH_KEY" -o IdentitiesOnly=yes -o ConnectTimeout=10 -o BatchMode=yes "ubuntu@$host" "$@"
}

public_health() {
  local base=$1 hdr=$2
  curl -sk -o /dev/null -w '%{http_code}' --max-time 8 -H "Host: $hdr" "$base/readyz"
}

check_assets() {
  local host=$1 mismatch=0 a remote
  for a in "${ASSETS[@]}"; do
    remote=$(ssh_node "$host" "sha256sum /opt/fluxlane/deploy/${a#deploy/} 2>/dev/null | cut -d' ' -f1" || true)
    [ "$remote" = "$(sha256sum "$a" | cut -d' ' -f1)" ] || { say "asset drift on $host: $a"; mismatch=1; }
  done
  return $mismatch
}

# sync-assets never deploys anything: it copies files, sets modes, and stops.
sync_assets() {
  local host=$1 a dest mode
  ssh_node "$host" 'sudo -n mkdir -p /opt/fluxlane/deploy/common /opt/fluxlane/deploy/api /opt/fluxlane/deploy/run && sudo -n chown -R ubuntu:ubuntu /opt/fluxlane/deploy'
  for a in "${ASSETS[@]}"; do
    dest="/opt/fluxlane/deploy/${a#deploy/}"
    mode=644; [ "${a##*.}" = sh ] && mode=755
    scp -q -i "$SSH_KEY" -o IdentitiesOnly=yes -o BatchMode=yes "$a" "ubuntu@$host:/tmp/rollout-asset"
    ssh_node "$host" "sudo -n install -m $mode /tmp/rollout-asset $dest && rm -f /tmp/rollout-asset && sha256sum $dest"
  done
  say "assets synced to $host from commit $COMMIT"
}

if [ "$MODE" = sync-assets ]; then
  say "asset source: $REPO_DIR @ $COMMIT (deploy NOT requested; nothing will be restarted)"
  FAILED=0
  for NODE in "$@"; do
    node_meta "$NODE" >/dev/null || die "unknown node: $NODE (see --list)"
    read -r _ HOST _ _ <<<"$(node_meta "$NODE")"
    say "=== syncing $NODE ($HOST) ==="
    sync_assets "$HOST"
    check_assets "$HOST" || { say "verification FAILED on $NODE"; FAILED=1; }
  done
  [ "$FAILED" = 0 ] && say "SYNC-ASSETS COMPLETE: all nodes match $COMMIT" || exit 1
  exit 0
fi

# --- deploy mode: cluster-wide lock for the entire run ------------------------
exec 8>"$LOCK_FILE"
flock -n 8 || die "another production rollout holds $LOCK_FILE"
say "cluster rollout lock acquired: $LOCK_FILE (held until the whole run ends)"
say "assets source: $REPO_DIR @ $COMMIT"

ROLLOUT_ID="$TAG-$$-$(date -u +%H%M%SZ)"
FAILED=0

for NODE in "$@"; do
  meta=$(node_meta "$NODE") || die "unknown node: $NODE (see --list)"
  read -r ROLE HOST BASE HDR <<<"$meta"

  say "=== $NODE ($ROLE, $HOST) ==="
  c=$(public_health "$BASE" "$HDR")
  [ "$c" = 200 ] || die "public entry $BASE unhealthy ($c) before $NODE — stopping (previous nodes stay as-is)"

  check_assets "$HOST" || die "deploy assets on $HOST differ from $COMMIT; run: rollout.sh sync-assets $NODE"

  if ssh_node "$HOST" "test -f /opt/fluxlane/deploy/.active-rollout"; then
    die "$NODE holds an active rollout lease ($(ssh_node "$HOST" 'cat /opt/fluxlane/deploy/.active-rollout')) — refusing"
  fi

  if ! ssh_node "$HOST" "sudo -n FLUXLANE_ROLLOUT_ID=$ROLLOUT_ID-$NODE /opt/fluxlane/deploy/common/rolling.sh $ROLE $TAG $BASE $HDR"; then
    say "NODE $NODE FAILED — remaining nodes skipped, lock released"
    FAILED=1
    break
  fi

  sleep 10
  c=$(public_health "$BASE" "$HDR")
  [ "$c" = 200 ] || { say "WARNING public entry $BASE returned $c after $NODE — investigate before continuing"; FAILED=1; break; }
  say "$NODE done; public entry healthy"
done

if [ "$FAILED" = 0 ]; then
  say "ROLLOUT COMPLETE: $TAG on: $*"
else
  say "ROLLOUT INCOMPLETE — fix and re-run for the remaining nodes only"
  exit 1
fi
