# Architecture and discovery

```text
Cloudflare
├─ www.fluxlane.ai     → Pages
├─ console.fluxlane.ai → Pages
├─ doc.fluxlane.ai     → Pages
├─ api.fluxlane.ai     → API CLB → API-1/API-2 → Nginx → 127.0.0.1:3000
└─ run.fluxlane.ai     → RUN CLB → RUN-1/RUN-2 → Nginx → 127.0.0.1:3000
```

API/RUN → TencentDB PostgreSQL / `fluxlane_prod`  
API/RUN → TencentDB Redis / DB `0`

## Known inventory

Treat all inventory as mutable and verify it before any change.

Public CLB nodes at skill creation:

- API-1 `124.156.104.48`
- API-2 `43.154.68.173`
- RUN-1 `43.154.184.164`
- RUN-2 `150.109.45.79`

Committed private data targets in `deploy/api-cvm/README.md` (verify live; do not treat as secrets, but never print credentials):

- PostgreSQL `10.20.1.11:5432`, database `fluxlane_prod`
- Redis `10.20.1.13:6379`, logical database `0`
- Node secrets file `/etc/fluxlane-api.env` (`root:root`, mode `600`)

Retired hosts `119.28.32.254` and `43.129.27.206` are never source/build hosts. Code comes from managed GitHub; current CLB nodes or approved CI build clean explicit commits.

## CLB and probes

API normally uses CLB backend HTTP:80 and HTTP `/readyz`. RUN normally uses HTTPS:443 and HTTPS `/readyz`. Verify live Tencent Cloud rules and health-source security groups.

Application probes:

- `/healthz`: process liveness only. Implementation: `router/health.go`.
- `/readyz`: initialization complete and accepting work. It does not check PostgreSQL, Redis, or Providers.

CLB must use `/readyz`. TCP-open is insufficient. Readiness 200 is not end-to-end Billing/Provider proof; monitor shared dependencies separately.

Repo templates can drift from live CLB:

- `deploy/api-cvm/nginx-api.conf` listens 80/443 and proxies to `127.0.0.1:3000`.
- `deploy/api-cvm/docker-compose.yml` currently healthchecks `/api/status`, not `/readyz`. Verify the live compose file and CLB rule independently; do not assume they match.

## Frontend and docs Pages

- Dashboard static build and production CORS/session origins: `docs/frontend-separation.md`
- Docs Pages project `fluxlane-docs`, production branch `fluxlane/frontend-separation`: `docs-site/README.md`
- Legacy combined Nginx (static + API proxy on `www`) is not the current production path: `deploy/nginx/fluxlane-separated.conf`

Never edit production static files directly. Pages deploy from Git commit → preview → production.

## Preflight

Verify DNS/CLB, membership, Git/image/config, dirty state, node and CLB probes, restart/OOM/resources, Nginx traffic/errors, PostgreSQL/Redis targets, backup status, and surviving-peer capacity. Never print credentials or secrets.

## Repo pointers

- API CVM deploy/rollback templates: `deploy/api-cvm/`
- API Nginx template: `deploy/api-cvm/nginx-api.conf`
- Health router: `router/health.go`, tests in `router/health_test.go`
- Frontend separation: `docs/frontend-separation.md`
- Docs Pages: `docs-site/README.md`
