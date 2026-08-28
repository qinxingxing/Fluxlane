# Releases, CLB, and nodes

Full procedure: `docs/operations/RELEASE_WORKFLOW.md`. Rollback: `docs/operations/ROLLBACK_WORKFLOW.md`.

## Build once, ship the tarball

1. Tag on `main` after Test Agent PASS and user approval.
2. Clean worktree `/home/codex/build/<release-tag>` on `43.160.247.94`.
3. Write Tag into `VERSION`; inject Git SHA.
4. Build `fluxlane/new-api:<release-tag>` once.
5. `docker save | zstd` + SHA256 into `/home/codex/releases/<release-tag>/`.
6. Test Agent validates **that** artifact (`RELEASE CANDIDATE PASS`).
7. User approves production.
8. Each node: confirm peer health → detach CLB → drain (RUN SSE 120s) → checksum → `docker load` → pin Compose Tag with `pull_policy: never` → `docker compose up -d` (never `down`) → `/healthz` `/readyz` healthy, matching Image ID and `/api/status` version → smoke → rejoin → observe → next node.

Default order: API-1 → API-2 → RUN-1 → RUN-2. Same service never updates two nodes together.

GitHub is the only code source. Do not `docker build` on API/RUN. Do not rebuild after tests.

## CLB health

- API: backend HTTP:80; health HTTP; Host `api.fluxlane.ai`; Path `/readyz`; expected 200.
- RUN: backend HTTPS:443; health HTTPS; Host `run.fluxlane.ai`; Path `/readyz`; expected 200.
- Initial timeout 2s, interval 5s, unhealthy/healthy threshold 3.

`deploy/api-cvm/` is the historical CVM template:

- `deploy-api.sh` fails closed unless PostgreSQL/Redis targets match.
- `rollback-api.sh` currently runs `compose down` — that is **not** the approved rollback. Use `ROLLBACK_WORKFLOW.md` (switch Tag, `up -d`, optional readyz-legacy override).

## Replacement and expansion

Approved CVM → harden → load the **same** release tarball → shared PostgreSQL/Redis → probes/smoke → CLB at low weight. Prove no local ledger. See [capacity.md](capacity.md).

## Pages

`www`, `console`, `doc`: `main` → Pages build → Test Agent UI checks → production. Frontend failure blocks a backend Tag.

Do not cache `/api/*`, `/v1/*`, login, billing, or webhook responses.
