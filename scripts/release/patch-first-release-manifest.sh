#!/usr/bin/env bash
# Patch release-manifest.json for the first standard production release:
# known concurrent-overdraft risk acceptance (required before verify-artifact
# when known_risks is non-empty).
#
# Usage:
#   FLUXLANE_RISK_ACCEPTED_BY='name' \
#   FLUXLANE_RISK_ACCEPTED_AT='2026-08-31T00:00:00Z' \
#   scripts/release/patch-first-release-manifest.sh prod-YYYYMMDD-<short-sha>
set -Eeuo pipefail

RELEASE_TAG=${1:-}
RELEASE_ROOT=${FLUXLANE_RELEASE_ROOT:-/home/codex/releases}
ACCEPTED_BY=${FLUXLANE_RISK_ACCEPTED_BY:-}
ACCEPTED_AT=${FLUXLANE_RISK_ACCEPTED_AT:-}

die() { printf 'patch-first-release-manifest: %s\n' "$*" >&2; exit 1; }

[[ -n $RELEASE_TAG ]] || die "usage: FLUXLANE_RISK_ACCEPTED_BY=... FLUXLANE_RISK_ACCEPTED_AT=... $0 prod-YYYYMMDD-<short-sha>"
[[ -n $ACCEPTED_BY ]] || die "FLUXLANE_RISK_ACCEPTED_BY is required"
[[ -n $ACCEPTED_AT ]] || die "FLUXLANE_RISK_ACCEPTED_AT is required (ISO8601 UTC)"
command -v jq >/dev/null || die "jq is required"

MANIFEST=$RELEASE_ROOT/$RELEASE_TAG/release-manifest.json
[[ -f $MANIFEST ]] || die "missing manifest: $MANIFEST"

tmp=$(mktemp)
jq \
  --arg accepted_by "$ACCEPTED_BY" \
  --arg accepted_at "$ACCEPTED_AT" \
  '.known_risks = [{
    id: "concurrent-wallet-overdraft",
    summary: "Concurrent in-flight requests can settle past a small remaining wallet, producing a negative balance.",
    accepted_max_overdraft_quota: -40000,
    observed_max_overdraft_quota: -40000,
    test_model_charge_quota: 40000,
    evidence: "Stage 5, 2026-08-27: qa-billing-u09 and u10 each 200000 remaining, 6 concurrent successes, 240000 charged."
  }]
  | .risk_accepted_by = $accepted_by
  | .risk_accepted_at = $accepted_at' \
  "$MANIFEST" > "$tmp"
mv "$tmp" "$MANIFEST"
printf 'patch-first-release-manifest: updated %s\n' "$MANIFEST"
