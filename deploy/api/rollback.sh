#!/usr/bin/env bash
# Roll THIS API node back to a previously released tag using the saved artifact.
# Never rebuilds from source. Never runs `docker compose down`. The node must be
# detached from CLB and drained; the peer API node must stay healthy.
#
# Usage:
#   FLUXLANE_CLB_DETACHED=yes deploy/api/rollback.sh prod-YYYYMMDD-<short-sha>
#
# Pre-probe images (no /readyz, no /healthz) additionally need:
#   FLUXLANE_LEGACY_READYZ=yes FLUXLANE_NGINX_SITE=/etc/nginx/conf.d/<live>.conf
# Add FLUXLANE_SCHEMA_APPROVED=yes only after the user accepted a schema risk.
set -Eeuo pipefail

FLUXLANE_ROLE=api-rollback
SCRIPT_DIR=$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd)
# shellcheck source=../common/node-lib.sh
source "$SCRIPT_DIR/../common/node-lib.sh"

TARGET_TAG=${1:-}
CONTAINER=${FLUXLANE_CONTAINER_NAME:-fluxlane-api}
COMPOSE_FILE=${FLUXLANE_COMPOSE_FILE:-$SCRIPT_DIR/docker-compose.yml}
LEGACY_OVERRIDE=$SCRIPT_DIR/../common/docker-compose.readyz-legacy-api.yml
LEGACY_SITE_TEMPLATE=$SCRIPT_DIR/nginx-readyz-legacy.conf
RECORD_DIR=${FLUXLANE_RECORD_DIR:-/opt/fluxlane/deploy-records}
LEGACY=${FLUXLANE_LEGACY_READYZ:-no}

[[ -n $TARGET_TAG ]] || die "usage: FLUXLANE_CLB_DETACHED=yes $0 prod-YYYYMMDD-<short-sha>"
require_tag_format "$TARGET_TAG"
require_drained_acknowledgement

for cmd in docker curl sha256sum zstd jq; do
  command -v "$cmd" >/dev/null || die "$cmd is required"
done

CURRENT_TAG=$(docker inspect --format '{{.Config.Image}}' "$CONTAINER" 2>/dev/null | awk -F: '{print $NF}' || true)
[[ -n $CURRENT_TAG ]] && require_schema_rollback_approval "$CURRENT_TAG" "$TARGET_TAG"

mkdir -p "$RECORD_DIR"
record_current_state "$CONTAINER" "$RECORD_DIR/api-rollback-$TARGET_TAG.before"

load_and_verify_image "$TARGET_TAG"

export FLUXLANE_IMAGE_TAG=$TARGET_TAG
export FLUXLANE_NODE_NAME=${FLUXLANE_NODE_NAME:-$(hostname)}

if [[ $LEGACY == yes ]]; then
  say "legacy mode: /api/status healthcheck and temporary /readyz site"
  install_legacy_readyz_site "$LEGACY_SITE_TEMPLATE" "$RECORD_DIR"
  trap 'restore_legacy_readyz_site' ERR
  compose_up -f "$COMPOSE_FILE" -f "$LEGACY_OVERRIDE"
else
  compose_up -f "$COMPOSE_FILE"
fi

wait_for_container_health "$CONTAINER"

if [[ $LEGACY == yes ]]; then
  require_legacy_probe
  say "node rolled back to $TARGET_TAG on the legacy probe path"
  say "CLB probes /readyz through the temporary site; restore deploy/api/nginx.conf as soon as a /readyz-capable release returns"
  say "backup of the live site: ${LEGACY_SITE_BACKUP:-none}"
else
  require_probe /healthz 200
  require_probe /readyz 200
  require_reported_identity "$TARGET_TAG"
fi
check_restart_and_oom "$CONTAINER"

say "smoke test, then rejoin CLB only if stable"
