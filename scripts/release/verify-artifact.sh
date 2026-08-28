#!/usr/bin/env bash
# Verify a Fluxlane release artifact against its manifest before or after
# docker load. Read-only: it never changes CLB, Compose, or running containers.
#
# Usage:
#   scripts/release/verify-artifact.sh prod-YYYYMMDD-<short-sha>            # tarball + manifest
#   scripts/release/verify-artifact.sh prod-YYYYMMDD-<short-sha> --loaded   # also check the local image
set -Eeuo pipefail

RELEASE_TAG=${1:-}
shift || true
CHECK_LOADED=no
CHECK_RELEASE_GATE=no
for arg in "$@"; do
  case $arg in
    --loaded) CHECK_LOADED=yes ;;
    --release-gate) CHECK_RELEASE_GATE=yes ;;
    *) printf 'verify-artifact: unknown option %s\n' "$arg" >&2; exit 1 ;;
  esac
done
RELEASE_ROOT=${FLUXLANE_RELEASE_ROOT:-/home/codex/releases}
IMAGE_REPO=${FLUXLANE_IMAGE_REPO:-fluxlane/new-api}

die() { printf 'verify-artifact: %s\n' "$*" >&2; exit 1; }
ok() { printf 'verify-artifact: OK %s\n' "$*"; }

[[ -n $RELEASE_TAG ]] || die "usage: $0 prod-YYYYMMDD-<short-sha> [--loaded] [--release-gate]"
[[ $RELEASE_TAG =~ ^prod-[0-9]{8}-[0-9a-f]{7,40}$ ]] || die "bad tag format: $RELEASE_TAG"
command -v jq >/dev/null || die "jq is required"

RELEASE_DIR=$RELEASE_ROOT/$RELEASE_TAG
MANIFEST=$RELEASE_DIR/release-manifest.json
ARTIFACT=$RELEASE_DIR/fluxlane-new-api-$RELEASE_TAG.tar.zst

[[ -f $MANIFEST ]] || die "missing manifest: $MANIFEST"
[[ -f $ARTIFACT ]] || die "missing artifact: $ARTIFACT"
[[ -f $ARTIFACT.sha256 ]] || die "missing checksum: $ARTIFACT.sha256"

( cd "$RELEASE_DIR" && sha256sum -c --status "$(basename "$ARTIFACT").sha256" ) \
  || die "artifact checksum mismatch"
ok "artifact checksum"

manifest_field() { jq -re --arg k "$1" '.[$k] // empty' "$MANIFEST"; }

[[ $(manifest_field release_tag) == "$RELEASE_TAG" ]] || die "manifest release_tag mismatch"
[[ $(manifest_field version_file) == "$RELEASE_TAG" ]] || die "manifest version_file must equal the tag"
GIT_SHA=$(manifest_field git_sha)
[[ ${#GIT_SHA} -eq 40 ]] || die "manifest git_sha must be the full 40-char commit"
[[ $RELEASE_TAG == *-"${GIT_SHA:0:7}"* ]] || die "tag suffix does not match git_sha"
[[ $(manifest_field artifact_sha256) == "$(cut -d' ' -f1 < "$ARTIFACT.sha256")" ]] \
  || die "manifest artifact_sha256 does not match the checksum file"
for key in docker_image_id new_api_binary_sha256 build_command dockerfile_sha256 schema_code_sha256; do
  manifest_field "$key" >/dev/null || die "manifest missing $key"
done
ok "manifest identity fields"

if grep -Eqi '(BEGIN [A-Z ]*PRIVATE KEY|sk-[A-Za-z0-9]{20,}|password=|postgres(ql)?://[^ "]*:[^ "]*@)' "$MANIFEST"; then
  die "manifest appears to contain a secret"
fi
ok "manifest has no secret-looking values"

RISK_COUNT=$(jq -r '(.known_risks // []) | length' "$MANIFEST")
if (( RISK_COUNT > 0 )); then
  [[ -n $(manifest_field risk_accepted_by) ]] \
    || die "known_risks recorded but risk_accepted_by is empty; user acceptance is required"
  [[ -n $(manifest_field risk_accepted_at) ]] \
    || die "known_risks recorded but risk_accepted_at is empty"

  # Every quantified risk needs an accepted ceiling, a measured value, and a
  # charge basis. Absolute values are compared so a credit recorded as a
  # negative number cannot pass by being "smaller".
  while read -r risk; do
    id=$(jq -r '.id // "unnamed"' <<<"$risk")
    accepted=$(jq -r '.accepted_max_overdraft_quota // ""' <<<"$risk")
    observed=$(jq -r '.observed_max_overdraft_quota // ""' <<<"$risk")
    charge=$(jq -r '.test_model_charge_quota // ""' <<<"$risk")
    [[ $accepted =~ ^-?[0-9]+$ ]] || die "risk '$id' has no numeric accepted_max_overdraft_quota"
    [[ $observed =~ ^-?[0-9]+$ ]] || die "risk '$id' has no numeric observed_max_overdraft_quota"
    [[ $charge =~ ^[0-9]+$ ]] || die "risk '$id' has no numeric test_model_charge_quota"
    (( ${accepted#-} > 0 )) || die "risk '$id' accepted_max_overdraft_quota must be non-zero"
    (( ${observed#-} <= ${accepted#-} )) \
      || die "risk '$id' observed overdraft ${observed} exceeds accepted ceiling ${accepted}"
    ok "risk '$id' observed ${observed} within accepted ${accepted} (charge ${charge}/request)"
  done < <(jq -c '(.known_risks // [])[]' "$MANIFEST")

  ok "known risks accepted by $(manifest_field risk_accepted_by) at $(manifest_field risk_accepted_at)"
fi

ROLLBACK_TAG=$(jq -r '.rollback_tag // ""' "$MANIFEST")
if [[ -n $ROLLBACK_TAG ]]; then
  ROLLBACK_ARTIFACT=$(jq -r '.rollback_artifact_path // ""' "$MANIFEST")
  [[ -f $ROLLBACK_ARTIFACT ]] || die "rollback artifact missing: $ROLLBACK_ARTIFACT"
  ok "rollback artifact present ($ROLLBACK_TAG)"
else
  printf 'verify-artifact: WARNING no unified rollback tag; per-node emergency images are the only fallback (first release)\n' >&2
fi

# Gate used immediately before rolling production: the Test Agent verdict must
# already be recorded as PASS in the manifest.
if [[ $CHECK_RELEASE_GATE == yes ]]; then
  CANDIDATE=$(jq -r '.candidate_result // ""' "$MANIFEST")
  [[ $CANDIDATE == "RELEASE CANDIDATE PASS" ]] \
    || die "candidate_result is '$CANDIDATE', expected 'RELEASE CANDIDATE PASS'"
  [[ -n $(jq -r '.test_report_path // ""' "$MANIFEST") ]] || die "manifest has no test_report_path"
  ok "candidate_result recorded as PASS"
fi

if [[ $CHECK_LOADED == yes ]]; then
  command -v docker >/dev/null || die "docker is required for --loaded"
  IMAGE=$IMAGE_REPO:$RELEASE_TAG
  docker image inspect "$IMAGE" >/dev/null 2>&1 || die "image not loaded: $IMAGE"
  [[ $(docker image inspect "$IMAGE" --format '{{.Id}}') == "$(manifest_field docker_image_id)" ]] \
    || die "loaded Image ID differs from the manifest; this node is not running the built artifact"
  [[ $(docker run --rm --entrypoint sha256sum "$IMAGE" /new-api | cut -d' ' -f1) \
      == "$(manifest_field new_api_binary_sha256)" ]] \
    || die "binary SHA256 differs from the manifest"
  REPORTED=$(docker run --rm --entrypoint /new-api "$IMAGE" --version | tr -d '\r')
  grep -qxF "$RELEASE_TAG" <<<"$REPORTED" || die "image reports wrong version: $REPORTED"
  grep -qxF "commit $GIT_SHA" <<<"$REPORTED" || die "image reports wrong commit: $REPORTED"
  ok "loaded image matches tag, Image ID, binary SHA256, and commit"
fi

printf 'verify-artifact: PASS %s\n' "$RELEASE_TAG"
