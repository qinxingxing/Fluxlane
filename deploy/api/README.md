# Fluxlane API node assets (tagged releases)

| File | Purpose |
|---|---|
| `docker-compose.yml` | Pins `fluxlane/new-api:${FLUXLANE_IMAGE_TAG}`, `pull_policy: never`, container healthcheck on `/readyz` |
| `nginx.conf` | 80/443 for `api.fluxlane.ai` → `127.0.0.1:3000`, probes proxied to the app |
| `nginx-readyz-legacy.conf` | Rollback-only **complete** site that answers `/readyz` from `/api/status` |
| `deploy.sh` | Verify the artifact, load, `compose up -d`, probes, `/api/status` identity |
| `rollback.sh` | Same for a previously released tag, with schema gate and legacy probe mode |

Shared helpers and overrides live in `../common/`.

## Identity defaults

Container `fluxlane-api`, env `/etc/fluxlane-api.env`, data `/opt/fluxlane-api/data`, logs `/opt/fluxlane-api/logs` — matching the current API CVM (`../api-cvm/`). Override with `FLUXLANE_CONTAINER_NAME`, `FLUXLANE_ENV_FILE`, `FLUXLANE_DATA_DIR`, `FLUXLANE_LOG_DIR` if a node differs. Verify the live values before the first tagged deploy; do not rename anything as part of image convergence.

## Use

```bash
# Node already detached from CLB and drained.
FLUXLANE_CLB_DETACHED=yes deploy/api/deploy.sh prod-YYYYMMDD-<short-sha>
```

Artifacts are required under `${FLUXLANE_RELEASE_ROOT:-/opt/fluxlane/releases}/<tag>/`: tarball, `.sha256`, and `release-manifest.json`, copied from the development host. Identity verification fails closed — a missing manifest, missing `jq`, or any mismatch of Image ID, binary SHA256, tag, or commit stops the deploy. The scripts do not build, do not touch CLB, and do not rejoin the pool.

Rollback to a pre-probe image:

```bash
FLUXLANE_CLB_DETACHED=yes FLUXLANE_LEGACY_READYZ=yes \
FLUXLANE_NGINX_SITE=/etc/nginx/conf.d/<live-site>.conf \
deploy/api/rollback.sh prod-YYYYMMDD-<previous>
```

That validates `/api/status` instead of `/healthz` and `/readyz`, and swaps the live Nginx site for `nginx-readyz-legacy.conf` after a backup plus `nginx -t`.

Full procedure: `docs/operations/RELEASE_WORKFLOW.md`. Rollback: `docs/operations/ROLLBACK_WORKFLOW.md`.
