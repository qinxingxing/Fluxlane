#!/usr/bin/env bash
# Deploy one production release to THIS API node. The node must already be
# detached from the API CLB and drained; the peer API node must stay healthy.
#
# Usage:
#   FLUXLANE_CLB_DETACHED=yes deploy/api/deploy.sh prod-YYYYMMDD-<short-sha>
set -Eeuo pipefail

FLUXLANE_ROLE=api
SCRIPT_DIR=$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd)
# shellcheck source=../common/node-lib.sh
source "$SCRIPT_DIR/../common/node-lib.sh"

RELEASE_TAG=${1:-}
CONTAINER=${FLUXLANE_CONTAINER_NAME:-fluxlane-api}
COMPOSE_FILE=${FLUXLANE_COMPOSE_FILE:-$SCRIPT_DIR/docker-compose.yml}
RECORD_DIR=${FLUXLANE_RECORD_DIR:-/opt/fluxlane/deploy-records}

[[ -n $RELEASE_TAG ]] || die "usage: FLUXLANE_CLB_DETACHED=yes $0 prod-YYYYMMDD-<short-sha>"
require_tag_format "$RELEASE_TAG"
require_drained_acknowledgement

for cmd in docker curl sha256sum zstd; do
  command -v "$cmd" >/dev/null || die "$cmd is required"
done

mkdir -p "$RECORD_DIR"
record_current_state "$CONTAINER" "$RECORD_DIR/api-$RELEASE_TAG.before"

load_and_verify_image "$RELEASE_TAG"

export FLUXLANE_IMAGE_TAG=$RELEASE_TAG
export FLUXLANE_NODE_NAME=${FLUXLANE_NODE_NAME:-$(hostname)}
compose_up -f "$COMPOSE_FILE"

wait_for_container_health "$CONTAINER"
require_probe /healthz 200
require_probe /readyz 200
require_reported_identity "$RELEASE_TAG"
check_restart_and_oom "$CONTAINER"

say "node updated to $RELEASE_TAG; run role smoke tests, then rejoin CLB manually"
say "rollback: FLUXLANE_CLB_DETACHED=yes deploy/api/rollback.sh <previous-tag>"
