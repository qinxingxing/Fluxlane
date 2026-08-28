# Fluxlane production release workflow

Skill companion: `.agents/skills/fluxlane-production-operations/references/releases.md`.

## Preconditions

- `main` SHA is the intended release.
- Test Agent Pages checks passed if frontend changed.
- User approved the production Tag.
- Development host `43.160.247.94` is in the **build** window (not a Mock load or Billing window).
- Disk free ≥ 20%; no OOM; previous release tarball still on disk.

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

## One build (this host only)

Worktree: `/home/codex/build/<release-tag>`

1. Clean checkout of the Tag.
2. Write the Tag into `VERSION`.
3. Build `fluxlane/new-api:<release-tag>` (frontend + Go). Inject Git SHA into the runtime.
4. Record Image ID, `/new-api` SHA256, `schema_model_tree_sha` (`git rev-parse <tag>:model`), builder hostname, time, previous rollback Tag.
5. Save + zstd + sha256 under `/home/codex/releases/<release-tag>/`.
6. Fill `release-manifest.json` (see `RELEASE_MANIFEST.example.json`).

Production nodes never `docker build`. Four nodes receive this file via `docker load`.

## Test Agent on the artifact

`RELEASE CANDIDATE PASS` required. Any rebuild after this point requires a new candidate.

## User approval to roll

Without it, stop.

## Four nodes

Default order: **API-1 → API-2 → RUN-1 → RUN-2**. Never two nodes of the same service together.

Per node:

1. Peer healthy and can take traffic.
2. Record old image, Compose, health, Restart, OOM.
3. Detach from CLB. Drain. RUN SSE initially 120s.
4. Verify tarball SHA256. `docker load`. Confirm Image ID and binary SHA256.
5. Compose `image: fluxlane/new-api:<release-tag>` and `pull_policy: never`.
6. `docker compose up -d` — not `down`.
7. `/healthz=200`, `/readyz=200`, Docker healthy, Restart not climbing, OOM=false, `/api/status` version = Tag.
8. Role smoke. Rejoin CLB. Wait CLB healthy. Hit the public hostname.
9. Watch 5xx, P95/P99, PostgreSQL, Redis. Then the next node.

On failure: stop the remaining nodes; leave the failed node out; keep the healthy peer; evaluate rollback (`ROLLBACK_WORKFLOW.md`).

## After all four

Test Agent: `PRODUCTION RELEASE PASS` or `PRODUCTION RELEASE FAIL — ROLLBACK RECOMMENDED`.

Keep current and previous tarballs, manifests, and images.
