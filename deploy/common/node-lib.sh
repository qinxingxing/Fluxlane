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

# Verifies the artifact and manifest first, loads the image when the node does
# not have it, then proves the local image is exactly the built artifact.
# Every step fails closed: "build once, four nodes run the same artifact" cannot
# be downgraded to a warning.
load_and_verify_image() {
  local tag=$1
  local dir=$RELEASE_ROOT/$tag
  local artifact=$dir/fluxlane-new-api-$tag.tar.zst
  local manifest=$dir/release-manifest.json
  local image=$IMAGE_REPO:$tag

  command -v jq >/dev/null || die "jq is required to verify release identity"
  [[ -f $manifest ]] || die "missing manifest: $manifest"
  [[ -f $artifact ]] || die "missing artifact: $artifact"
  [[ -f $artifact.sha256 ]] || die "missing checksum: $artifact.sha256"

  # Always checksum the artifact, including when the image is already present:
  # a matching image name proves nothing about which bits produced it.
  ( cd "$dir" && sha256sum -c --status "$(basename "$artifact").sha256" ) \
    || die "artifact checksum mismatch for $tag"

  local recorded_artifact_sha actual_artifact_sha
  recorded_artifact_sha=$(jq -r '.artifact_sha256 // ""' "$manifest")
  actual_artifact_sha=$(cut -d' ' -f1 < "$artifact.sha256")
  [[ -n $recorded_artifact_sha ]] || die "manifest has no artifact_sha256"
  [[ $recorded_artifact_sha == "$actual_artifact_sha" ]] \
    || die "manifest artifact_sha256 does not match the checksum file"

  local want_id want_bin want_sha
  want_id=$(jq -r '.docker_image_id // ""' "$manifest")
  want_bin=$(jq -r '.new_api_binary_sha256 // ""' "$manifest")
  want_sha=$(jq -r '.git_sha // ""' "$manifest")
  [[ -n $want_id ]] || die "manifest has no docker_image_id"
  [[ -n $want_bin ]] || die "manifest has no new_api_binary_sha256"
  [[ ${#want_sha} -eq 40 ]] || die "manifest git_sha must be the full 40-char commit"
  [[ $tag == *-"${want_sha:0:7}"* ]] || die "tag $tag does not match manifest git_sha"

  if ! docker image inspect "$image" >/dev/null 2>&1; then
    say "loading $image"
    zstd -dc "$artifact" | docker load
  fi
  docker image inspect "$image" >/dev/null 2>&1 || die "image still missing after load: $image"

  local got_id got_bin reported
  got_id=$(docker image inspect "$image" --format '{{.Id}}')
  [[ $want_id == "$got_id" ]] \
    || die "Image ID mismatch: node has $got_id, manifest says $want_id (per-node rebuild?)"
  got_bin=$(docker run --rm --entrypoint sha256sum "$image" /new-api | cut -d' ' -f1)
  [[ $want_bin == "$got_bin" ]] || die "binary SHA256 mismatch for $image"
  reported=$(docker run --rm --entrypoint /new-api "$image" --version | tr -d '\r')
  grep -qxF "$tag" <<<"$reported" || die "image reports wrong version: $reported"
  grep -qxF "commit $want_sha" <<<"$reported" || die "image does not report commit $want_sha"

  say "image verified: tag, Image ID, binary SHA256, commit"
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
      none)
        docker logs --tail 100 "$container" >&2
        die "container has no healthcheck (wrong compose override, wrong compose file, or unexpected container)"
        ;;
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

# Images that predate the probes serve neither /readyz nor /healthz, so a
# legacy rollback is validated through /api/status instead.
require_legacy_probe() {
  require_probe /api/status 200
}

# Resolves sites-enabled symlinks to the real file under sites-available.
resolve_nginx_site_path() {
  local site=$1 resolved
  [[ -n $site ]] || die "nginx site path is required"
  [[ -e $site ]] || die "nginx site not found: $site"
  resolved=$(readlink -f "$site")
  [[ -n $resolved && -f $resolved ]] \
    || die "nginx site is not a regular file: $site (resolved: ${resolved:-none})"
  printf '%s\n' "$resolved"
}

reload_nginx_or_die() {
  nginx -t || die "nginx -t failed"
  nginx -s reload || die "nginx reload failed"
}

nginx_site_is_legacy_readyz() {
  local site=$1
  grep -q 'X-Fluxlane-Readyz-Source.*legacy-api-status' "$site" 2>/dev/null
}

nginx_readyz_has_legacy_header() {
  local url=${FLUXLANE_NGINX_PROBE_URL:-https://127.0.0.1/readyz}
  local headers
  headers=$(curl -skS -D - -o /dev/null --max-time 5 "$url" 2>/dev/null | tr -d '\r') || return 1
  grep -qi 'X-Fluxlane-Readyz-Source: legacy-api-status' <<<"$headers"
}

require_nginx_native_readyz() {
  local url=${FLUXLANE_NGINX_PROBE_URL:-https://127.0.0.1/readyz}
  local code headers
  code=$(curl -skS -o /dev/null -w '%{http_code}' --max-time 5 "$url" || echo 000)
  [[ $code == 200 ]] || die "nginx /readyz returned $code, expected 200"
  headers=$(curl -skS -D - -o /dev/null --max-time 5 "$url" 2>/dev/null | tr -d '\r') \
    || die "cannot probe nginx /readyz at $url"
  if grep -qi 'X-Fluxlane-Readyz-Source: legacy-api-status' <<<"$headers"; then
    die "nginx still serves /readyz via legacy shim (X-Fluxlane-Readyz-Source: legacy-api-status)"
  fi
  say "nginx /readyz = 200 (native proxy, no legacy shim)"
}

# After a legacy rollback, a normal deploy must restore the role template before
# the node rejoins CLB; otherwise /readyz keeps answering from /api/status.
ensure_normal_nginx_site() {
  local normal_template=$1 record_dir=$2
  local site_input=${FLUXLANE_NGINX_SITE:-}
  [[ -n $site_input ]] || die \
    "FLUXLANE_NGINX_SITE is required (e.g. /etc/nginx/sites-available/fluxlane-api)"
  [[ -f $normal_template ]] || die "normal nginx template not found: $normal_template"
  command -v nginx >/dev/null || die "nginx is required to verify the live site"

  local site backup
  site=$(resolve_nginx_site_path "$site_input")

  if nginx_site_is_legacy_readyz "$site" || nginx_readyz_has_legacy_header; then
    say "legacy Nginx /readyz shim detected; restoring normal site at $site"
    backup=$record_dir/$(basename "$site").legacy-revert.$(date -u +%Y%m%dT%H%M%SZ).bak
    cp -- "$site" "$backup"
    cp -- "$normal_template" "$site"
    if ! nginx -t; then
      cp -- "$backup" "$site"
      reload_nginx_or_die || true
      die "normal Nginx site failed nginx -t; previous site restored from $backup"
    fi
    reload_nginx_or_die
    say "normal Nginx site restored (backup: $backup)"
  else
    say "nginx site is not legacy: $site"
  fi

  require_nginx_native_readyz
}

# Replaces the live Nginx site with the rollback-only legacy site, which answers
# /readyz from /api/status. Operates on the resolved real file (sites-available),
# backs up file content (not a symlink), tests, reloads, and restores on failure.
install_legacy_readyz_site() {
  local template=$1 record_dir=$2
  local site_input=${FLUXLANE_NGINX_SITE:-}
  [[ -n $site_input ]] || die "FLUXLANE_LEGACY_READYZ=yes requires FLUXLANE_NGINX_SITE=<live site path>"
  [[ -f $template ]] || die "legacy site template not found: $template"
  command -v nginx >/dev/null || die "nginx is required to install the legacy site"

  LEGACY_SITE_PATH=$(resolve_nginx_site_path "$site_input")
  LEGACY_SITE_BACKUP=$record_dir/$(basename "$LEGACY_SITE_PATH").$(date -u +%Y%m%dT%H%M%SZ).bak
  cp -- "$LEGACY_SITE_PATH" "$LEGACY_SITE_BACKUP"
  say "backed up $LEGACY_SITE_PATH to $LEGACY_SITE_BACKUP"

  cp -- "$template" "$LEGACY_SITE_PATH"
  if ! nginx -t; then
    cp -- "$LEGACY_SITE_BACKUP" "$LEGACY_SITE_PATH"
    reload_nginx_or_die || true
    die "legacy Nginx site failed nginx -t; original site restored"
  fi
  reload_nginx_or_die
  say "legacy /readyz site active (temporary, drained node only)"
}

restore_legacy_readyz_site() {
  [[ -n ${LEGACY_SITE_BACKUP:-} && -f ${LEGACY_SITE_BACKUP:-} ]] || return 0
  [[ -n ${LEGACY_SITE_PATH:-} ]] || return 0
  cp -- "$LEGACY_SITE_BACKUP" "$LEGACY_SITE_PATH"
  reload_nginx_or_die
  say "restored $LEGACY_SITE_PATH from $LEGACY_SITE_BACKUP"
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
