# Fluxlane API node assets (tagged releases)

| File | Purpose |
|---|---|
| `docker-compose.yml` | Pins `fluxlane/new-api:${FLUXLANE_IMAGE_TAG}`, `pull_policy: never`, container healthcheck on `/readyz` |
| `nginx.conf` | 80/443 for `api.fluxlane.ai` → `127.0.0.1:3000`, probes proxied to the app |
| `deploy.sh` | Load + verify the artifact, `compose up -d`, probes, `/api/status` identity |
| `rollback.sh` | Same for a previously released tag, with schema gate and legacy probe option |

Shared helpers and overrides live in `../common/`.

## Identity defaults

Container `fluxlane-api`, env `/etc/fluxlane-api.env`, data `/opt/fluxlane-api/data`, logs `/opt/fluxlane-api/logs` — matching the current API CVM (`../api-cvm/`). Override with `FLUXLANE_CONTAINER_NAME`, `FLUXLANE_ENV_FILE`, `FLUXLANE_DATA_DIR`, `FLUXLANE_LOG_DIR` if a node differs. Verify the live values before the first tagged deploy; do not rename anything as part of image convergence.

## Use

```bash
# Node already detached from CLB and drained.
FLUXLANE_CLB_DETACHED=yes deploy/api/deploy.sh prod-YYYYMMDD-<short-sha>
```

Artifacts are expected under `${FLUXLANE_RELEASE_ROOT:-/opt/fluxlane/releases}/<tag>/` (tarball, `.sha256`, `release-manifest.json`) copied from the development host. The scripts do not build, do not touch CLB, and do not rejoin the pool.

Full procedure: `docs/operations/RELEASE_WORKFLOW.md`. Rollback: `docs/operations/ROLLBACK_WORKFLOW.md`.
