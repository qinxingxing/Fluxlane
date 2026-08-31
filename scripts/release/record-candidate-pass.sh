#!/usr/bin/env bash
# Record RELEASE CANDIDATE PASS in the manifest after Test Agent sign-off.
# Does not modify running containers or production.
#
# Usage:
#   scripts/release/record-candidate-pass.sh prod-YYYYMMDD-<short-sha> test-report.md
set -Eeuo pipefail

RELEASE_TAG=${1:-}
REPORT_PATH=${2:-test-report.md}
RELEASE_ROOT=${FLUXLANE_RELEASE_ROOT:-/home/codex/releases}

die() { printf 'record-candidate-pass: %s\n' "$*" >&2; exit 1; }

[[ -n $RELEASE_TAG ]] || die "usage: $0 prod-YYYYMMDD-<short-sha> [test-report.md]"
command -v jq >/dev/null || die "jq is required"

MANIFEST=$RELEASE_ROOT/$RELEASE_TAG/release-manifest.json
[[ -f $MANIFEST ]] || die "missing manifest: $MANIFEST"

tmp=$(mktemp)
jq \
  --arg report "$REPORT_PATH" \
  '.candidate_result = "RELEASE CANDIDATE PASS"
  | .test_report_path = $report' \
  "$MANIFEST" > "$tmp"
mv "$tmp" "$MANIFEST"
printf 'record-candidate-pass: wrote RELEASE CANDIDATE PASS to %s\n' "$MANIFEST"
