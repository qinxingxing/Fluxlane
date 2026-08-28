# Fluxlane RUN node assets (tagged releases)

| File | Purpose |
|---|---|
| `docker-compose.yml` | Pins `fluxlane/new-api:${FLUXLANE_IMAGE_TAG}`, `pull_policy: never`, container healthcheck on `/readyz` |
| `nginx.conf` | 443 for `run.fluxlane.ai` → `127.0.0.1:3000`, buffering off for SSE, probes proxied to the app |
| `deploy.sh` | Load + verify the artifact, `compose up -d`, probes, `/api/status` identity |
| `rollback.sh` | Same for a previously released tag, with schema gate and legacy probe option |

Shared helpers and overrides live in `../common/`.

## Identity defaults keep the current RUN node names

Defaults deliberately match what RUN already runs:

| Setting | Default | Override |
|---|---|---|
| Container | `new-api` | `FLUXLANE_CONTAINER_NAME` |
| Env file | `/opt/new-api/secrets/runtime.env` | `FLUXLANE_ENV_FILE` |
| Data | `/opt/new-api/data` | `FLUXLANE_DATA_DIR` |
| Logs | `/opt/new-api/logs` | `FLUXLANE_LOG_DIR` |

The first tagged deploy converges **only** the image tag and the readiness probe. Confirm these four values on RUN-1 and RUN-2 before running `deploy.sh`; if a node differs, pass the override rather than editing the template.

Renaming the container to `fluxlane-run` or moving the env file to `/etc/fluxlane-run.env` is a **separate approved change**, because it breaks callers that address the container or env path by name. That change must first enumerate and update, at minimum:

- log collection and rotation referencing `new-api`
- audit and QA scripts using `docker logs new-api` / `docker exec new-api`
- monitoring and alert rules keyed on the container name
- sudo wrappers such as `/usr/local/sbin/deploy-*` and rollback wrappers
- any systemd unit, cron job, or backup script reading `/opt/new-api/`

Do not mix that rename into a release.

## Use

```bash
# Node already detached from CLB, SSE drained (start at 120s).
FLUXLANE_CLB_DETACHED=yes deploy/run/deploy.sh prod-YYYYMMDD-<short-sha>
```

Full procedure: `docs/operations/RELEASE_WORKFLOW.md`. Rollback: `docs/operations/ROLLBACK_WORKFLOW.md`.
