# Architecture and discovery

```text
Cloudflare
├─ www.fluxlane.ai     → Pages (from main)
├─ console.fluxlane.ai → Pages (from main)
├─ doc.fluxlane.ai     → Pages (from main)
├─ api.fluxlane.ai     → API CLB → API-1/API-2 → Nginx → 127.0.0.1:3000
└─ run.fluxlane.ai     → RUN CLB → RUN-1/RUN-2 → Nginx → 127.0.0.1:3000
```

API/RUN → TencentDB PostgreSQL / `fluxlane_prod`, and TencentDB Redis / DB `0`.

Build host (only): `43.160.247.94` user `codex`. Production nodes never build.

## Known inventory

Treat all inventory as mutable and verify it before any change.

Public CLB nodes at last documentation:

- API-1 `124.156.104.48`
- API-2 `43.154.68.173`
- RUN-1 `43.154.184.164`
- RUN-2 `150.109.45.79`

Committed private data targets in `deploy/api-cvm/README.md` (verify live; never print credentials):

- PostgreSQL `10.20.1.11:5432`, database `fluxlane_prod`
- Redis `10.20.1.13:6379`, logical database `0`
- Node secrets file `/etc/fluxlane-api.env` (`root:root`, mode `600`)

Retired hosts `119.28.32.254` and `43.129.27.206` are never source or build hosts.

## CLB and probes

API normally uses CLB backend HTTP:80 and HTTP `/readyz`. RUN normally uses HTTPS:443 and HTTPS `/readyz`. Verify live Tencent Cloud rules and health-source security groups.

- `/healthz`: process liveness only. `router/health.go`
- `/readyz`: initialization complete and accepting work. Does not check PostgreSQL, Redis, or Providers.

TCP-open is insufficient. Readiness 200 is not end-to-end Billing/Provider proof.

Repo assets:

- Historical live CVM template (may lag HEAD): `deploy/api-cvm/` healthchecks `/api/status`, image tag `eaae4af5`.
- Tagged-release assets: `deploy/api/` and `deploy/run/` (Compose, `nginx.conf`, `deploy.sh`, `rollback.sh`), shared helpers and rollback-only legacy probe files in `deploy/common/`.
- Node identity defaults, kept as they already run: API container `fluxlane-api` with `/etc/fluxlane-api.env`; RUN container `new-api` with `/opt/new-api/secrets/runtime.env`. Renaming either is a separate approved change, never part of a release.

Do not assume Git matches the running Compose file.

## Frontend and docs Pages

- Dashboard: `docs/frontend-separation.md`. Never put secrets in `VITE_*`.
- Docs Pages project `fluxlane-docs`. Production Pages must follow `main` after this workflow is adopted.
- Legacy combined Nginx is not the current production path: `deploy/nginx/fluxlane-separated.conf`

Never edit production static files directly.

## Preflight

Verify DNS/CLB, membership, Git/image/config, dirty state, node and CLB probes, restart/OOM/resources, Nginx, PostgreSQL/Redis targets, backup status, surviving-peer capacity, and that the release tarball SHA256 matches. Never print credentials.
