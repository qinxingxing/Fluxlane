#!/usr/bin/env bash
# Layer-1 release candidate smoke on the development host: load the built
# artifact if needed, start one container with SQLite (no production secrets),
# and verify identity probes. Does not touch CLB or production databases.
#
# Usage:
#   scripts/release/candidate-layer1-smoke.sh prod-YYYYMMDD-<short-sha>
set -Eeuo pipefail

RELEASE_TAG=${1:-}
RELEASE_ROOT=${FLUXLANE_RELEASE_ROOT:-/home/codex/releases}
IMAGE_REPO=${FLUXLANE_IMAGE_REPO:-fluxlane/new-api}
HOST_PORT=${FLUXLANE_CANDIDATE_PORT:-13000}
PROBE_TIMEOUT_SECONDS=${FLUXLANE_PROBE_TIMEOUT_SECONDS:-120}

die() { printf 'candidate-layer1-smoke: %s\n' "$*" >&2; exit 1; }
ok() { printf 'candidate-layer1-smoke: OK %s\n' "$*"; }

[[ -n $RELEASE_TAG ]] || die "usage: $0 prod-YYYYMMDD-<short-sha>"
[[ $RELEASE_TAG =~ ^prod-[0-9]{8}-[0-9a-f]{7,40}$ ]] || die "bad tag format: $RELEASE_TAG"
command -v docker >/dev/null || die "docker is required"
command -v jq >/dev/null || die "jq is required"
command -v curl >/dev/null || die "curl is required"
command -v zstd >/dev/null || die "zstd is required"

RELEASE_DIR=$RELEASE_ROOT/$RELEASE_TAG
MANIFEST=$RELEASE_DIR/release-manifest.json
ARTIFACT=$RELEASE_DIR/fluxlane-new-api-$RELEASE_TAG.tar.zst
IMAGE=$IMAGE_REPO:$RELEASE_TAG
CONTAINER=fluxlane-candidate-$RELEASE_TAG
DATA_DIR=$(mktemp -d)

cleanup() {
  docker rm -f "$CONTAINER" >/dev/null 2>&1 || true
  if [[ -d $DATA_DIR ]]; then
    chmod -R u+w "$DATA_DIR" 2>/dev/null || true
    rm -rf "$DATA_DIR"
  fi
}
trap cleanup EXIT

[[ -f $MANIFEST ]] || die "missing manifest: $MANIFEST"
[[ -f $ARTIFACT ]] || die "missing artifact: $ARTIFACT"
[[ -f $ARTIFACT.sha256 ]] || die "missing checksum: $ARTIFACT.sha256"
( cd "$RELEASE_DIR" && sha256sum -c --status "$(basename "$ARTIFACT").sha256" ) \
  || die "artifact checksum mismatch"

GIT_SHA=$(jq -r '.git_sha // ""' "$MANIFEST")
[[ ${#GIT_SHA} -eq 40 ]] || die "manifest git_sha missing"

if ! docker image inspect "$IMAGE" >/dev/null 2>&1; then
  printf 'candidate-layer1-smoke: loading %s\n' "$IMAGE" >&2
  zstd -dc "$ARTIFACT" | docker load
fi
docker image inspect "$IMAGE" >/dev/null 2>&1 || die "image not loaded: $IMAGE"

docker rm -f "$CONTAINER" >/dev/null 2>&1 || true
docker run -d --name "$CONTAINER" \
  -p "127.0.0.1:${HOST_PORT}:3000" \
  -v "$DATA_DIR:/data" \
  -e GIN_MODE=release \
  "$IMAGE" >/dev/null

waited=0
while (( waited < PROBE_TIMEOUT_SECONDS )); do
  code=$(curl -sS -o /dev/null -w '%{http_code}' --max-time 2 "http://127.0.0.1:${HOST_PORT}/readyz" || echo 000)
  [[ $code == 200 ]] && break
  sleep 2
  waited=$((waited + 2))
done
[[ $code == 200 ]] || die "/readyz did not return 200 within ${PROBE_TIMEOUT_SECONDS}s (last=$code)"

for path in /healthz /readyz; do
  code=$(curl -sS -o /dev/null -w '%{http_code}' --max-time 5 "http://127.0.0.1:${HOST_PORT}${path}")
  [[ $code == 200 ]] || die "$path returned $code"
  ok "$path = 200"
done

body=$(curl -sS --max-time 5 "http://127.0.0.1:${HOST_PORT}/api/status")
version=$(jq -r '.data.version // ""' <<<"$body")
commit=$(jq -r '.data.git_commit // ""' <<<"$body")
[[ $version == "$RELEASE_TAG" ]] || die "/api/status version is '$version', expected $RELEASE_TAG"
[[ $commit == "$GIT_SHA" ]] || die "/api/status git_commit is '$commit', expected $GIT_SHA"
ok "/api/status reports $version ($commit)"

reported=$(docker exec "$CONTAINER" /new-api --version | tr -d '\r')
grep -qxF "$RELEASE_TAG" <<<"$reported" || die "container --version missing tag"
grep -qxF "commit $GIT_SHA" <<<"$reported" || die "container --version missing commit"
ok "/new-api --version matches manifest"

code=$(curl -sS -o /dev/null -w '%{http_code}' --max-time 5 \
  -H 'Content-Type: application/json' \
  -d '{"model":"qa-mock-model","messages":[{"role":"user","content":"ping"}]}' \
  "http://127.0.0.1:${HOST_PORT}/v1/chat/completions" || echo 000)
[[ $code == 401 ]] || die "unauthenticated relay returned $code, expected 401"
ok "relay without token = 401"

restart_count=$(docker inspect --format '{{.RestartCount}}' "$CONTAINER")
oom=$(docker inspect --format '{{.State.OOMKilled}}' "$CONTAINER")
[[ $oom == false ]] || die "container OOM killed"
ok "restart_count=$restart_count oom=false"

printf 'candidate-layer1-smoke: PASS %s (Mock stream/non-stream still require QA Mock on :18080)\n' "$RELEASE_TAG"
