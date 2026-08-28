#!/usr/bin/env bash
# Build one Fluxlane production release artifact from an existing annotated tag.
#
# Usage: scripts/release/build-release.sh prod-YYYYMMDD-<short-sha>
#
# Runs only on the development host (43.160.247.94). Never on API/RUN nodes.
# Reads no production secrets and connects to no production database.
set -Eeuo pipefail

RELEASE_TAG=${1:-}
REPO_DIR=${FLUXLANE_REPO_DIR:-/home/codex/workspace/Fluxlane}
BUILD_ROOT=${FLUXLANE_BUILD_ROOT:-/home/codex/build}
RELEASE_ROOT=${FLUXLANE_RELEASE_ROOT:-/home/codex/releases}
IMAGE_REPO=${FLUXLANE_IMAGE_REPO:-fluxlane/new-api}
MIN_FREE_PERCENT=${FLUXLANE_MIN_FREE_PERCENT:-20}

die() { printf 'build-release: %s\n' "$*" >&2; exit 1; }

[[ -n $RELEASE_TAG ]] || die "usage: $0 prod-YYYYMMDD-<short-sha>"
[[ $RELEASE_TAG =~ ^prod-[0-9]{8}-[0-9a-f]{7,40}$ ]] \
  || die "tag '$RELEASE_TAG' does not match prod-YYYYMMDD-<short-sha>"

command -v docker >/dev/null || die "docker is required"
command -v zstd >/dev/null || die "zstd is required"
command -v sha256sum >/dev/null || die "sha256sum is required"
command -v jq >/dev/null || die "jq is required"

BUILD_DIR=$BUILD_ROOT/$RELEASE_TAG
RELEASE_DIR=$RELEASE_ROOT/$RELEASE_TAG
ARTIFACT=$RELEASE_DIR/fluxlane-new-api-$RELEASE_TAG.tar.zst
IMAGE=$IMAGE_REPO:$RELEASE_TAG

[[ -d $REPO_DIR/.git ]] || die "no git repository at $REPO_DIR"
[[ -e $BUILD_DIR ]] && die "build directory already exists: $BUILD_DIR"
[[ -e $ARTIFACT ]] && die "artifact already exists, tags are never rebuilt: $ARTIFACT"

free_percent=$(df --output=pcent "$BUILD_ROOT" 2>/dev/null | tail -1 | tr -dc '0-9')
[[ -n $free_percent ]] || die "cannot read free space for $BUILD_ROOT"
(( 100 - free_percent >= MIN_FREE_PERCENT )) \
  || die "free space below ${MIN_FREE_PERCENT}% on $BUILD_ROOT"

cd "$REPO_DIR"
git fetch origin --tags
git rev-parse -q --verify "refs/tags/$RELEASE_TAG" >/dev/null \
  || die "tag $RELEASE_TAG does not exist; create and push it first"
[[ $(git cat-file -t "$RELEASE_TAG") == tag ]] \
  || die "tag $RELEASE_TAG must be annotated"

GIT_SHA=$(git rev-parse "$RELEASE_TAG^{}")
git merge-base --is-ancestor "$GIT_SHA" origin/main \
  || die "tag $RELEASE_TAG is not an ancestor of origin/main"
[[ $RELEASE_TAG == *-"${GIT_SHA:0:7}"* ]] \
  || die "tag suffix does not match commit ${GIT_SHA:0:7}"

# Clean worktree: build inputs never come from a dirty shared checkout.
mkdir -p "$BUILD_ROOT" "$RELEASE_DIR"
git worktree add --detach "$BUILD_DIR" "$GIT_SHA" >/dev/null
cleanup() { git -C "$REPO_DIR" worktree remove --force "$BUILD_DIR" >/dev/null 2>&1 || true; }
trap cleanup EXIT

cd "$BUILD_DIR"
[[ -z $(git status --porcelain) ]] || die "build worktree is dirty"
printf '%s\n' "$RELEASE_TAG" > VERSION

grep -RIlqs -e 'BEGIN OPENSSH PRIVATE KEY' -e 'BEGIN RSA PRIVATE KEY' . \
  && die "private key material found in build worktree"

SCHEMA_CODE_SHA=$(
  git -C "$BUILD_DIR" ls-tree -r "$GIT_SHA" --name-only -- model \
    | sort \
    | while read -r path; do
        printf '%s %s\n' "$path" "$(git -C "$BUILD_DIR" rev-parse "$GIT_SHA:$path")"
      done \
    | sha256sum | cut -d' ' -f1
)
DOCKERFILE_SHA=$(sha256sum Dockerfile | cut -d' ' -f1)
API_COMPOSE_SHA=$(sha256sum deploy/api/docker-compose.yml | cut -d' ' -f1)
RUN_COMPOSE_SHA=$(sha256sum deploy/run/docker-compose.yml | cut -d' ' -f1)
API_NGINX_SHA=$(sha256sum deploy/api/nginx.conf | cut -d' ' -f1)
RUN_NGINX_SHA=$(sha256sum deploy/run/nginx.conf | cut -d' ' -f1)
BASE_IMAGE_DIGESTS=$(grep -E '^FROM ' Dockerfile | awk '{print $2}' | jq -R . | jq -sc .)

BUILD_COMMAND="docker build --pull --build-arg GIT_COMMIT=$GIT_SHA -t $IMAGE ."
printf 'build-release: building %s once\n' "$IMAGE" >&2
docker build --pull --build-arg "GIT_COMMIT=$GIT_SHA" -t "$IMAGE" .

IMAGE_ID=$(docker image inspect "$IMAGE" --format '{{.Id}}')
BINARY_SHA=$(docker run --rm --entrypoint sha256sum "$IMAGE" /new-api | cut -d' ' -f1)
REPORTED_VERSION=$(docker run --rm --entrypoint /new-api "$IMAGE" --version | tr -d '\r')
grep -qxF "$RELEASE_TAG" <<<"$REPORTED_VERSION" \
  || die "binary reports '$REPORTED_VERSION', expected release tag $RELEASE_TAG"
grep -qxF "commit $GIT_SHA" <<<"$REPORTED_VERSION" \
  || die "binary does not report commit $GIT_SHA; GIT_COMMIT injection failed"

printf 'build-release: exporting artifact\n' >&2
docker save "$IMAGE" | zstd -T0 -10 -q -o "$ARTIFACT"
( cd "$RELEASE_DIR" && sha256sum "$(basename "$ARTIFACT")" > "$(basename "$ARTIFACT").sha256" )
ARTIFACT_SHA=$(cut -d' ' -f1 < "$ARTIFACT.sha256")

PREVIOUS_TAG=$(
  git -C "$REPO_DIR" tag --list 'prod-*' --sort=-creatordate \
    | grep -vxF "$RELEASE_TAG" | head -1
)
PREVIOUS_ARTIFACT=""
if [[ -n $PREVIOUS_TAG ]]; then
  PREVIOUS_ARTIFACT=$RELEASE_ROOT/$PREVIOUS_TAG/fluxlane-new-api-$PREVIOUS_TAG.tar.zst
  [[ -f $PREVIOUS_ARTIFACT ]] || printf 'build-release: WARNING rollback artifact missing: %s\n' "$PREVIOUS_ARTIFACT" >&2
fi
PREVIOUS_SCHEMA_SHA=""
if [[ -n $PREVIOUS_TAG ]]; then
  PREVIOUS_SCHEMA_SHA=$(
    git -C "$REPO_DIR" ls-tree -r "$PREVIOUS_TAG^{}" --name-only -- model \
      | sort \
      | while read -r path; do
          printf '%s %s\n' "$path" "$(git -C "$REPO_DIR" rev-parse "$PREVIOUS_TAG^{}:$path")"
        done \
      | sha256sum | cut -d' ' -f1
  )
fi
SCHEMA_NOTES="model/ unchanged vs $PREVIOUS_TAG; app rollback needs no schema statement"
if [[ -z $PREVIOUS_TAG ]]; then
  SCHEMA_NOTES="first production tag; no previous schema baseline"
elif [[ $PREVIOUS_SCHEMA_SHA != "$SCHEMA_CODE_SHA" ]]; then
  SCHEMA_NOTES="model/ CHANGED vs $PREVIOUS_TAG; AutoMigrate moves the schema forward. Rollback requires an explicit compatibility statement and user approval."
fi

jq -n \
  --arg release_tag "$RELEASE_TAG" \
  --arg git_sha "$GIT_SHA" \
  --arg git_sha_short "${GIT_SHA:0:7}" \
  --arg version_file "$RELEASE_TAG" \
  --arg built_at_utc "$(date -u +%Y-%m-%dT%H:%M:%SZ)" \
  --arg builder_hostname "$(hostname)" \
  --arg builder_user "$(id -un)" \
  --arg image_name "$IMAGE" \
  --arg docker_image_id "$IMAGE_ID" \
  --arg new_api_binary_sha256 "$BINARY_SHA" \
  --arg reported_version_output "$REPORTED_VERSION" \
  --arg artifact_path "$ARTIFACT" \
  --arg artifact_sha256 "$ARTIFACT_SHA" \
  --arg frontend_build_version "$RELEASE_TAG" \
  --arg build_command "$BUILD_COMMAND" \
  --arg dockerfile_sha256 "$DOCKERFILE_SHA" \
  --argjson base_image_digests "$BASE_IMAGE_DIGESTS" \
  --arg api_compose_sha256 "$API_COMPOSE_SHA" \
  --arg run_compose_sha256 "$RUN_COMPOSE_SHA" \
  --arg api_nginx_sha256 "$API_NGINX_SHA" \
  --arg run_nginx_sha256 "$RUN_NGINX_SHA" \
  --arg schema_code_sha256 "$SCHEMA_CODE_SHA" \
  --arg schema_notes "$SCHEMA_NOTES" \
  --arg rollback_tag "$PREVIOUS_TAG" \
  --arg rollback_artifact_path "$PREVIOUS_ARTIFACT" \
  '{
    schema: "fluxlane-release-manifest/v1",
    release_tag: $release_tag,
    git_sha: $git_sha,
    git_sha_short: $git_sha_short,
    version_file: $version_file,
    built_at_utc: $built_at_utc,
    builder_hostname: $builder_hostname,
    builder_user: $builder_user,
    image_name: $image_name,
    docker_image_id: $docker_image_id,
    new_api_binary_sha256: $new_api_binary_sha256,
    reported_version_output: $reported_version_output,
    artifact_path: $artifact_path,
    artifact_sha256: $artifact_sha256,
    frontend_build_version: $frontend_build_version,
    build_command: $build_command,
    dockerfile_sha256: $dockerfile_sha256,
    base_image_digests: $base_image_digests,
    compose_template_sha256: { api: $api_compose_sha256, run: $run_compose_sha256 },
    nginx_template_sha256: { api: $api_nginx_sha256, run: $run_nginx_sha256 },
    schema_mechanism: "gorm_automigrate",
    schema_code_sha256: $schema_code_sha256,
    schema_notes: $schema_notes,
    rollback_tag: $rollback_tag,
    rollback_artifact_path: $rollback_artifact_path,
    test_report_path: "test-report.md",
    candidate_result: "pending",
    production_result: "not-yet",
    deployment_nodes: [],
    known_risks: [],
    risk_accepted_by: "",
    risk_accepted_at: ""
  }' > "$RELEASE_DIR/release-manifest.json"

printf 'build-release: wrote %s\n' "$RELEASE_DIR/release-manifest.json" >&2
printf '%s %s %s\n' "$RELEASE_TAG" "$IMAGE_ID" "$ARTIFACT_SHA"
