#!/usr/bin/env bash
# Roll THIS API node back to a previously released tag using the saved artifact.
# Never rebuilds from source. Never runs `docker compose down`. The node must be
# detached from CLB and drained; the peer API node must stay healthy.
#
# Usage:
#   FLUXLANE_CLB_DETACHED=yes deploy/api/rollback.sh prod-YYYYMMDD-<short-sha>
#
# Add FLUXLANE_LEGACY_READYZ=yes when the target image predates /readyz.
# Add FLUXLANE_SCHEMA_APPROVED=yes only after the user accepted a schema risk.
set -Eeuo pipefail

FLUXLANE_ROLE=api-rollback
SCRIPT_DIR=$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd)
# shellcheck source=../common/node-lib.sh
source "$SCRIPT_DIR/../common/node-lib.sh"

TARGET_TAG=${1:-}
CONTAINER=${FLUXLANE_CONTAINER_NAME:-fluxlane-api}
COMPOSE_FILE=${FLUXLANE_COMPOSE_FILE:-$SCRIPT_DIR/docker-compose.yml}
LEGACY_OVERRIDE=$SCRIPT_DIR/../common/docker-compose.readyz-legacy.yml
RECORD_DIR=${FLUXLANE_RECORD_DIR:-/opt/fluxlane/deploy-records}

[[ -n $TARGET_TAG ]] || die "usage: FLUXLANE_CLB_DETACHED=yes $0 prod-YYYYMMDD-<short-sha>"
require_tag_format "$TARGET_TAG"
require_drained_acknowledgement

CURRENT_TAG=$(docker inspect --format '{{.Config.Image}}' "$CONTAINER" 2>/dev/null | awk -F: '{print $NF}' || true)
[[ -n $CURRENT_TAG ]] && require_schema_rollback_approval "$CURRENT_TAG" "$TARGET_TAG"

mkdir -p "$RECORD_DIR"
record_current_state "$CONTAINER" "$RECORD_DIR/api-rollback-$TARGET_TAG.before"

load_and_verify_image "$TARGET_TAG"

export FLUXLANE_IMAGE_TAG=$TARGET_TAG
export FLUXLANE_NODE_NAME=${FLUXLANE_NODE_NAME:-$(hostname)}

if [[ ${FLUXLANE_LEGACY_READYZ:-} == yes ]]; then
  export FLUXLANE_LEGACY_SERVICE=fluxlane-api
  say "using legacy /api/status healthcheck override; remove it before rejoining CLB"
  compose_up -f "$COMPOSE_FILE" -f "$LEGACY_OVERRIDE"
else
  compose_up -f "$COMPOSE_FILE"
fi

wait_for_container_health "$CONTAINER"
require_probe /healthz 200
if [[ ${FLUXLANE_LEGACY_READYZ:-} == yes ]]; then
  say "WARNING /readyz not expected on this image; CLB must not receive this node until a /readyz-capable release is restored or a documented legacy probe is in place"
else
  require_probe /readyz 200
  require_reported_identity "$TARGET_TAG"
fi
check_restart_and_oom "$CONTAINER"

say "node rolled back to $TARGET_TAG; smoke test, then rejoin CLB only if stable"
