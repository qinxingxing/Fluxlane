# Releases, CLB, and nodes

## Rolling release

1. Confirm peer health and single-node capacity.
2. Record commit, image, config, time, and rollback artifact.
3. Remove target from new CLB traffic by verified detach, zero weight, or Not Ready.
4. Confirm traffic stopped; drain connections and RUN Streaming/SSE.
5. Fetch a clean explicit GitHub commit on a current CLB node or approved CI.
6. Build a versioned image without secrets in args/layers/repository.
7. Deploy only the drained node.
8. Require running, stable restarts, OOM false, `/healthz=200`, `/readyz=200`.
9. Run role smoke tests with authorized credentials where needed.
10. Rejoin at low canary weight when practical.
11. Observe CLB, 5xx, latency, RPS, resources, application/Nginx, PostgreSQL, Redis, and Billing effects.
12. Only then repeat for the peer; verify matching versions and traffic distribution.

Prefer 10/90 then 50/50 canary; full detach → validate → 50/50 is acceptable.

Drain RUN Streaming/SSE for 120 seconds initially unless observed duration requires more. Never update or restart both nodes of one service together.

GitHub is the only code source. Deploy an explicit SHA or immutable image tag, never an unpinned branch result. Do not build on retired legacy servers.

## CLB health

- API: backend HTTP:80; health HTTP; Host `api.fluxlane.ai`; Path `/readyz`; expected 200.
- RUN: backend HTTPS:443; health HTTPS; Host `run.fluxlane.ai`; Path `/readyz`; expected 200.
- Initial timeout 2s, interval 5s, unhealthy/healthy threshold 3.

TCP-open is insufficient. Verify live Tencent Cloud rules and health-source security groups.

Repo templates in `deploy/api-cvm/` are starting points, not live proof:

- `deploy/api-cvm/deploy-api.sh` fails closed unless PostgreSQL/Redis targets match and are reachable.
- `deploy/api-cvm/rollback-api.sh` stops the local compose stack; it does not rejoin CLB.
- `deploy/api-cvm/docker-compose.yml` currently healthchecks `/api/status`. Live CLB still must use `/readyz`. Confirm the running compose file before treating Docker `healthy` as readiness.

## Replacement and expansion

For replacement/expansion, create an approved CVM, harden it, deploy the same image, connect shared data, prove no local state, validate probes/smoke/logs/time/outbound access, join CLB at low weight, then observe. Use CLB, not DNS, for routine nodes.

Peers share PostgreSQL `fluxlane_prod` and Redis DB `0`. Local databases are not production state. Prove the new node has no local ledger before joining traffic.

## Pages

Pages `www`, `console`, `doc`: Git commit → preview → functional/security validation → production. Never edit production static files directly; roll back to the prior deployment.

- Dashboard: `docs/frontend-separation.md`. Build `web/` with `bun`; publish `web/dist`. Never put secrets in `VITE_*`.
- Docs: `docs-site/README.md`. Project `fluxlane-docs`, production branch `fluxlane/frontend-separation`.

Do not cache `/api/*`, `/v1/*`, login, billing, or webhook responses.
