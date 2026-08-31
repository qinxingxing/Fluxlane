# Releases, CLB, and nodes

Full procedure: `docs/operations/RELEASE_WORKFLOW.md`. Rollback: `docs/operations/ROLLBACK_WORKFLOW.md`.

## Build once, ship the tarball

1. Tag on `main` after Test Agent PASS and user approval.
2. `scripts/release/build-release.sh <release-tag>` on `43.160.247.94`: clean worktree, `VERSION`, `--build-arg GIT_COMMIT=<full-sha>`, single build, Image ID and binary SHA256, `.tar.zst` + `.sha256`, `release-manifest.json`. Fails closed; refuses to rebuild an existing artifact.
3. Fill `test-report.md`, `known_risks`, and risk acceptance fields.
4. Test Agent validates **that** artifact (`RELEASE CANDIDATE PASS`) using the layers in [testing.md](testing.md).
5. User approves production.
6. Each node: confirm peer health → detach CLB → drain (RUN SSE 120s) → `FLUXLANE_CLB_DETACHED=yes deploy/<role>/deploy.sh <tag>` → smoke → rejoin → observe → next node.

`deploy/<role>/deploy.sh` requires `jq`, the manifest, the tarball and checksum, then compares Image ID, binary SHA256, tag, and commit before running `docker compose up -d` (never `down`) and requiring `/healthz`, `/readyz`, and `/api/status` identity. Every check is fail-closed, including when the image is already present.

Rollback target: `releases/current-production.json` (from `scripts/release/record-production.sh`) or an explicit `FLUXLANE_ROLLBACK_TAG` — never the newest tag by date. Before the first recorded release there is no unified rollback artifact; keep each node's local `3c52e436` image as a node-level emergency fallback and record its Image ID.

Runtime identity: `/api/status` returns `version` and `git_commit`; `/new-api --version` prints the tag then `commit <full-sha>`. Do not set a `VERSION` env var on production nodes — it overrides the compiled tag and breaks verification.

Default order: API-1 → API-2 → RUN-1 → RUN-2. Same service never updates two nodes together.

GitHub is the only code source. Do not `docker build` on API/RUN. Do not rebuild after tests.

## CLB health

- API: backend HTTP:80; health HTTP; Host `api.fluxlane.ai`; Path `/readyz`; expected 200.
- RUN: backend HTTPS:443; health HTTPS; Host `run.fluxlane.ai`; Path `/readyz`; expected 200.
- Initial timeout 2s, interval 5s, unhealthy/healthy threshold 3.

`deploy/api-cvm/` is the historical CVM template:

- `deploy-api.sh` fails closed unless PostgreSQL/Redis targets match.
- `rollback-api.sh` runs `compose down` — that is **not** the approved rollback. Use `deploy/<role>/rollback.sh`, which enforces the `schema_code_sha256` gate and offers the rollback-only legacy probe override in `deploy/common/`.

## Replacement and expansion

Approved CVM → harden → load the **same** release tarball → shared PostgreSQL/Redis → probes/smoke → CLB at low weight. Prove no local ledger. See [capacity.md](capacity.md).

## Pages

`www`, `console`, `doc`: `main` → Pages build → Test Agent UI checks → production. Frontend failure blocks a backend Tag.

Do not cache `/api/*`, `/v1/*`, login, billing, or webhook responses.
