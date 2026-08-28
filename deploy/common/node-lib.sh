#!/usr/bin/env bash
# Shared node-side deploy/rollback helpers for Fluxlane API and RUN nodes.
# Sourced by deploy/api/{deploy,rollback}.sh and deploy/run/{deploy,rollback}.sh.
#
# These functions run on a production node that is already DRAINED and removed
# from CLB. They never touch CLB, DNS, PostgreSQL, Redis, or the peer node.
set -Eeuo pipefail

RELEASE_ROOT=${FLUXLANE_RELEASE_ROOT:-/opt/fluxlane/releases}
IMAGE_REPO=${FLUXLANE_IMAGE_REPO:-fluxlane/new-api}
PROBE_URL=${FLUXLANE_PROBE_URL:-http://127.0.0.1:3000}
PROBE_TIMEOUT_SECONDS=${FLUXLANE_PROBE_TIMEOUT_SECONDS:-120}

die() { printf '%s: %s\n' "${FLUXLANE_ROLE:-node}" "$*" >&2; exit 1; }
say() { printf '%s: %s\n' "${FLUXLANE_ROLE:-node}" "$*"; }

require_tag_format() {
  [[ $1 =~ ^prod-[0-9]{8}-[0-9a-f]{7,40}$ ]] \
    || die "tag '$1' must look like prod-YYYYMMDD-<short-sha>"
}

require_drained_acknowledgement() {
  [[ ${FLUXLANE_CLB_DETACHED:-} == yes ]] || die \
    "refusing to change a pooled node: detach it from CLB, drain (RUN SSE >=120s), then re-run with FLUXLANE_CLB_DETACHED=yes"
}

# Loads the release image from its artifact when the node does not already have
# it, then proves the loaded image is the artifact recorded in the manifest.
load_and_verify_image() {
  local tag=$1
  local dir=$RELEASE_ROOT/$tag
  local artifact=$dir/fluxlane-new-api-$tag.tar.zst
  local manifest=$dir/release-manifest.json
  local image=$IMAGE_REPO:$tag

  if ! docker image inspect "$image" >/dev/null 2>&1; then
    [[ -f $artifact ]] || die "image $image absent and artifact missing: $artifact"
    [[ -f $artifact.sha256 ]] || die "missing checksum: $artifact.sha256"
    ( cd "$dir" && sha256sum -c --status "$(basename "$artifact").sha256" ) \
      || die "artifact checksum mismatch for $tag"
    say "loading $image"
    zstd -dc "$artifact" | docker load
  fi

  docker image inspect "$image" >/dev/null 2>&1 || die "image still missing after load: $image"

  if [[ -f $manifest ]] && command -v jq >/dev/null; then
    local want_id want_bin got_id got_bin want_sha reported
    want_id=$(jq -r '.docker_image_id // ""' "$manifest")
    want_bin=$(jq -r '.new_api_binary_sha256 // ""' "$manifest")
    want_sha=$(jq -r '.git_sha // ""' "$manifest")
    got_id=$(docker image inspect "$image" --format '{{.Id}}')
    [[ -z $want_id || $want_id == "$got_id" ]] \
      || die "Image ID mismatch: node has $got_id, manifest says $want_id (per-node rebuild?)"
    if [[ -n $want_bin ]]; then
      got_bin=$(docker run --rm --entrypoint sha256sum "$image" /new-api | cut -d' ' -f1)
      [[ $want_bin == "$got_bin" ]] || die "binary SHA256 mismatch for $image"
    fi
    if [[ -n $want_sha ]]; then
      reported=$(docker run --rm --entrypoint /new-api "$image" --version | tr -d '\r')
      grep -qxF "commit $want_sha" <<<"$reported" \
        || die "image does not report commit $want_sha"
    fi
    say "image verified against manifest"
  else
    say "WARNING no manifest at $manifest; identity not verified"
  fi
}

record_current_state() {
  local service=$1 record=$2
  {
    printf 'recorded_at=%s\n' "$(date -u +%Y-%m-%dT%H:%M:%SZ)"
    printf 'host=%s\n' "$(hostname)"
    printf 'previous_image=%s\n' "$(docker inspect --format '{{.Config.Image}}' "$service" 2>/dev/null || echo none)"
    printf 'previous_image_id=%s\n' "$(docker inspect --format '{{.Image}}' "$service" 2>/dev/null || echo none)"
    printf 'previous_restart_count=%s\n' "$(docker inspect --format '{{.RestartCount}}' "$service" 2>/dev/null || echo none)"
    printf 'previous_health=%s\n' "$(docker inspect --format '{{if .State.Health}}{{.State.Health.Status}}{{else}}none{{end}}' "$service" 2>/dev/null || echo none)"
    printf 'previous_oom=%s\n' "$(docker inspect --format '{{.State.OOMKilled}}' "$service" 2>/dev/null || echo none)"
  } | tee "$record"
}

# Never `docker compose down`: that stops the node instead of replacing the
# container, and it is forbidden for both deploy and rollback.
compose_up() {
  docker compose "$@" up -d --remove-orphans
}

wait_for_container_health() {
  local container=$1 waited=0
  while (( waited < PROBE_TIMEOUT_SECONDS )); do
    local status
    status=$(docker inspect --format '{{if .State.Health}}{{.State.Health.Status}}{{else}}none{{end}}' "$container" 2>/dev/null || echo missing)
    case $status in
      healthy) say "container healthy"; return 0 ;;
      unhealthy) docker logs --tail 100 "$container" >&2; die "container unhealthy" ;;
      none) say "WARNING container has no healthcheck"; return 0 ;;
    esac
    sleep 5
    waited=$((waited + 5))
  done
  docker logs --tail 100 "$container" >&2
  die "container did not become healthy within ${PROBE_TIMEOUT_SECONDS}s"
}

require_probe() {
  local path=$1 expect=${2:-200} code
  code=$(curl -sS -o /dev/null -w '%{http_code}' --max-time 5 "$PROBE_URL$path" || echo 000)
  [[ $code == "$expect" ]] || die "$path returned $code, expected $expect"
  say "$path = $code"
}

# The deployed node must report the release tag and the full commit, otherwise
# the running code cannot be mapped back to the artifact.
require_reported_identity() {
  local tag=$1 dir=$RELEASE_ROOT/$tag manifest=$dir/release-manifest.json body version commit want_sha
  body=$(curl -sS --max-time 5 "$PROBE_URL/api/status") || die "cannot read /api/status"
  if command -v jq >/dev/null; then
    version=$(jq -r '.data.version // ""' <<<"$body")
    commit=$(jq -r '.data.git_commit // ""' <<<"$body")
    [[ $version == "$tag" ]] || die "/api/status version is '$version', expected $tag"
    if [[ -f $manifest ]]; then
      want_sha=$(jq -r '.git_sha // ""' "$manifest")
      [[ -z $want_sha || $commit == "$want_sha" ]] \
        || die "/api/status git_commit is '$commit', expected $want_sha"
    fi
    say "/api/status reports $version ($commit)"
  else
    grep -q "\"version\":\"$tag\"" <<<"$body" || die "/api/status does not report $tag"
    say "/api/status reports $tag (install jq to also verify git_commit)"
  fi
}

# AutoMigrate only moves the schema forward. If the release being rolled back
# from changed model code, an older binary may not tolerate the migrated tables,
# so the operator must record explicit approval.
require_schema_rollback_approval() {
  local from_tag=$1 to_tag=$2
  local from_manifest=$RELEASE_ROOT/$from_tag/release-manifest.json
  local to_manifest=$RELEASE_ROOT/$to_tag/release-manifest.json

  if ! command -v jq >/dev/null || [[ ! -f $from_manifest || ! -f $to_manifest ]]; then
    [[ ${FLUXLANE_SCHEMA_APPROVED:-} == yes ]] || die \
      "cannot compare schema_code_sha256 ($from_manifest / $to_manifest); re-run with FLUXLANE_SCHEMA_APPROVED=yes only after the user accepts the schema risk"
    say "WARNING schema comparison skipped, proceeding on recorded approval"
    return 0
  fi

  local from_sha to_sha
  from_sha=$(jq -r '.schema_code_sha256 // ""' "$from_manifest")
  to_sha=$(jq -r '.schema_code_sha256 // ""' "$to_manifest")
  if [[ -n $from_sha && $from_sha == "$to_sha" ]]; then
    say "schema code identical between $from_tag and $to_tag"
    return 0
  fi
  [[ ${FLUXLANE_SCHEMA_APPROVED:-} == yes ]] || die \
    "schema code differs ($from_tag -> $to_tag); an old binary would run against migrated tables. Get user approval, then re-run with FLUXLANE_SCHEMA_APPROVED=yes"
  say "schema differs; proceeding on recorded user approval"
}

check_restart_and_oom() {
  local container=$1
  [[ $(docker inspect --format '{{.State.OOMKilled}}' "$container") == false ]] || die "container was OOM killed"
  say "restart_count=$(docker inspect --format '{{.RestartCount}}' "$container") oom=false"
}
