#!/usr/bin/env bash
# Record which release production actually runs, after the Test Agent reports
# PRODUCTION RELEASE PASS for all four nodes.
#
# This state file — not Git tag creation time — is the rollback source of truth
# for the next build. A tag can exist without ever having been deployed.
#
# Usage:
#   scripts/release/record-production.sh prod-YYYYMMDD-<short-sha> "API-1,API-2,RUN-1,RUN-2"
set -Eeuo pipefail

RELEASE_TAG=${1:-}
NODES=${2:-}
RELEASE_ROOT=${FLUXLANE_RELEASE_ROOT:-/home/codex/releases}
STATE=$RELEASE_ROOT/current-production.json

die() { printf 'record-production: %s\n' "$*" >&2; exit 1; }

[[ -n $RELEASE_TAG ]] || die "usage: $0 prod-YYYYMMDD-<short-sha> \"API-1,API-2,RUN-1,RUN-2\""
[[ $RELEASE_TAG =~ ^prod-[0-9]{8}-[0-9a-f]{7,40}$ ]] || die "bad tag format: $RELEASE_TAG"
command -v jq >/dev/null || die "jq is required"

MANIFEST=$RELEASE_ROOT/$RELEASE_TAG/release-manifest.json
[[ -f $MANIFEST ]] || die "missing manifest: $MANIFEST"

CANDIDATE=$(jq -r '.candidate_result // ""' "$MANIFEST")
[[ $CANDIDATE == "RELEASE CANDIDATE PASS" ]] \
  || die "candidate_result is '$CANDIDATE'; only a passed candidate can become production"
PRODUCTION=$(jq -r '.production_result // ""' "$MANIFEST")
[[ $PRODUCTION == "PRODUCTION RELEASE PASS" ]] \
  || die "production_result is '$PRODUCTION'; record it in the manifest first"

PREVIOUS_TAG=""
[[ -f $STATE ]] && PREVIOUS_TAG=$(jq -r '.release_tag // ""' "$STATE")

jq -n \
  --arg release_tag "$RELEASE_TAG" \
  --arg git_sha "$(jq -r '.git_sha' "$MANIFEST")" \
  --arg docker_image_id "$(jq -r '.docker_image_id' "$MANIFEST")" \
  --arg artifact_path "$(jq -r '.artifact_path' "$MANIFEST")" \
  --arg schema_code_sha256 "$(jq -r '.schema_code_sha256' "$MANIFEST")" \
  --arg recorded_at_utc "$(date -u +%Y-%m-%dT%H:%M:%SZ)" \
  --arg recorded_by "$(id -un)@$(hostname)" \
  --arg previous_release_tag "$PREVIOUS_TAG" \
  --arg nodes "$NODES" \
  '{
    schema: "fluxlane-production-state/v1",
    release_tag: $release_tag,
    git_sha: $git_sha,
    docker_image_id: $docker_image_id,
    artifact_path: $artifact_path,
    schema_code_sha256: $schema_code_sha256,
    recorded_at_utc: $recorded_at_utc,
    recorded_by: $recorded_by,
    previous_release_tag: $previous_release_tag,
    nodes: ($nodes | split(",") | map(select(length > 0)))
  }' > "$STATE"

printf 'record-production: %s is now the recorded production release (previous: %s)\n' \
  "$RELEASE_TAG" "${PREVIOUS_TAG:-none}"
