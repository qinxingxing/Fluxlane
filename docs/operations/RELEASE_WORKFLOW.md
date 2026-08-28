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

It refuses to overwrite an existing artifact: a published tag is never rebuilt.

Then fill in `test-report.md`, `known_risks`, and — if any risk is recorded — `risk_accepted_by` / `risk_accepted_at` after the user accepts it.

Production nodes never `docker build`. All four nodes receive the same tarball.

## Test Agent on the artifact

Layered as described in `TESTING_WORKFLOW.md`: development-host image checks, live-version regression baseline, then one drained production node with the candidate loaded but out of the pool. `RELEASE CANDIDATE PASS` is required. Any rebuild after this point starts a new candidate.

## User approval to roll

Without it, stop.

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

Test Agent: `PRODUCTION RELEASE PASS` or `PRODUCTION RELEASE FAIL — ROLLBACK RECOMMENDED`. Record it in the manifest.

Keep current and previous tarballs, manifests, and images.
