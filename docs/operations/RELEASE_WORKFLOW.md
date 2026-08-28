# Fluxlane production release workflow

Skill companion: `.agents/skills/fluxlane-production-operations/references/releases.md`. Scripts: `scripts/release/`, `deploy/api/`, `deploy/run/`, `deploy/common/`.

## Preconditions

- `main` SHA is the intended release.
- Test Agent Pages checks passed if frontend changed.
- User approved the production tag.
- Development host `43.160.247.94` is in the **build** window (not a Mock load or Billing window).
- Disk free ≥ 20%; no OOM; previous release tarball still on disk.
- Node identity confirmed live: API container/env (`fluxlane-api`, `/etc/fluxlane-api.env`) and RUN container/env (`new-api`, `/opt/new-api/secrets/runtime.env`). A release never renames these.

## Tag

Annotated, unique, on `main`:

```text
prod-YYYYMMDD-<short-sha>
```

```bash
git show <tag>
git rev-parse <tag>^{}
git merge-base --is-ancestor <tag> origin/main
git push origin <tag>
```

## One build (development host only)

```bash
scripts/release/build-release.sh prod-YYYYMMDD-<short-sha>
```

The script fails closed and, in order: validates the tag format, requires an annotated tag that is an ancestor of `origin/main`, checks free space, creates the clean worktree `/home/codex/build/<tag>`, writes the tag into `VERSION`, builds once with `--build-arg GIT_COMMIT=<full-sha>`, asserts the binary reports both the tag and the commit, records Image ID and `/new-api` SHA256, exports `.tar.zst` + `.sha256`, and writes `release-manifest.json` (including `build_command`, `dockerfile_sha256`, `base_image_digests`, Compose/Nginx template hashes, and `schema_code_sha256`).

It creates `/home/codex/build` and `/home/codex/releases` when they are missing, then refuses to overwrite an existing per-tag artifact: a published tag is never rebuilt.

The rollback target comes from `releases/current-production.json` (written by `scripts/release/record-production.sh` after `PRODUCTION RELEASE PASS`) or from an explicit `FLUXLANE_ROLLBACK_TAG`. It is never inferred from Git tag creation time, because a tag can exist without ever having been deployed. If the recorded tag has no artifact on disk, the build stops.

Then fill in `test-report.md`, `known_risks` (with `accepted_max_overdraft_quota`, `observed_max_overdraft_quota`, `test_model_charge_quota`), and — if any risk is recorded — `risk_accepted_by` / `risk_accepted_at` after the user accepts it.

Production nodes never `docker build`. All four nodes receive the same tarball.

## Test Agent on the artifact

Layered as described in `TESTING_WORKFLOW.md`: development-host image checks, live-version regression baseline, then one drained production node with the candidate loaded but out of the pool. `RELEASE CANDIDATE PASS` is required. Any rebuild after this point starts a new candidate.

## User approval to roll

Without it, stop. Then gate on the recorded verdict:

```bash
scripts/release/verify-artifact.sh prod-YYYYMMDD-<short-sha> --release-gate
```

## First release has no unified rollback tag

Before the first `prod-` rollout the four nodes run per-node images built separately from `3c52e436`; their Image IDs differ. Therefore:

- Keep each node's existing local image as a **node-level emergency fallback**, and record its Image ID per node.
- Those images are not one previous version and must not be presented as a unified rollback tag.
- `deploy/*/rollback.sh` targets a `prod-` tag with an artifact and manifest, so it cannot roll back to them; a pre-tag emergency revert is a manual, per-node action on a drained node.
- Only after the first tagged release is deployed and recorded with `record-production.sh` does a unified, cross-node rollback artifact exist.
- Do not claim complete rollback coverage for the first release.

## Four nodes

Default order: **API-1 → API-2 → RUN-1 → RUN-2**. Never two nodes of the same service together.

Per node:

1. Peer healthy and able to carry traffic.
2. Copy `<tag>` release directory (tarball, `.sha256`, manifest) to the node's release root.
3. Detach from CLB. Drain. RUN SSE initially 120s.
4. Run the role script:

```bash
FLUXLANE_CLB_DETACHED=yes deploy/api/deploy.sh prod-YYYYMMDD-<short-sha>
# or
FLUXLANE_CLB_DETACHED=yes deploy/run/deploy.sh prod-YYYYMMDD-<short-sha>
```

It records the previous image/health, verifies the checksum, `docker load`s if needed, compares Image ID and binary SHA256 against the manifest, `docker compose up -d` (never `down`), waits for container health, requires `/healthz=200` and `/readyz=200`, and requires `/api/status` to report the tag and the manifest commit.

5. Role smoke on the drained node. Rejoin CLB. Wait for CLB healthy. Hit the public hostname.
6. Record the node in the manifest `deployment_nodes`.
7. Watch 5xx, P95/P99, PostgreSQL, Redis. Then the next node.

On failure: stop the remaining nodes; leave the failed node out; keep the healthy peer; evaluate rollback (`ROLLBACK_WORKFLOW.md`).

## After all four

Test Agent: `PRODUCTION RELEASE PASS` or `PRODUCTION RELEASE FAIL — ROLLBACK RECOMMENDED`. Record it in the manifest, then make it the rollback baseline for the next build:

```bash
scripts/release/record-production.sh prod-YYYYMMDD-<short-sha> "API-1,API-2,RUN-1,RUN-2"
```

That script refuses to run unless the manifest records both `RELEASE CANDIDATE PASS` and `PRODUCTION RELEASE PASS`.

Keep current and previous tarballs, manifests, and images.
