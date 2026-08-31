# Shared production deploy assets

Used by `deploy/api/` and `deploy/run/`. The historical single-node template stays in `deploy/api-cvm/` until a `prod-` tag is loaded on that node.

| File | Purpose |
|---|---|
| `node-lib.sh` | Shared node-side steps: tag format, drained acknowledgement, artifact + identity verification, state recording, `compose up`, probes, legacy Nginx site swap, schema rollback gate |
| `docker-compose.readyz-legacy-api.yml` | Rollback-only healthcheck override for API images that predate `/readyz` |
| `docker-compose.readyz-legacy-run.yml` | Same for RUN |

There is one override per role because Compose does not substitute variables in mapping keys: `services: ${VAR}:` is rejected with `Additional property ${VAR} is not allowed`.

The legacy `/readyz` shim is a **complete site** file in the role directory (`deploy/api/nginx-readyz-legacy.conf`, `deploy/run/nginx-readyz-legacy.conf`), not a snippet. Production sites live under `/etc/nginx/sites-available/` (API: `fluxlane-api`, RUN: `fluxlane-api-run`); `sites-enabled` entries are symlinks. `rollback.sh` resolves the real file with `readlink -f`, backs up file content (not the symlink), installs the legacy template, runs `nginx -t`, reloads, and restores the backup on failure. A normal `deploy.sh` detects a leftover legacy site (config marker or `X-Fluxlane-Readyz-Source: legacy-api-status`), restores the role template, and verifies native `/readyz` before rejoin.

## Image

```text
image: fluxlane/new-api:<release-tag>
pull_policy: never
```

The tag is the annotated Git tag. Load the tarball from the release directory before `compose up`. Do not `docker build` on a node. Do not use `latest`.

Identity verification fails closed. `node-lib.sh` requires `jq`, the manifest, the tarball and its checksum, and then requires the local image to match `docker_image_id`, `new_api_binary_sha256`, the tag, and the manifest commit — even when an image with that name is already present, because a matching name proves nothing about the bits.

## Health

Container healthchecks probe `http://127.0.0.1:3000/readyz` inside the app container, and CLB probes `/readyz` too. `/healthz` is liveness only. Deploy and rollback fail closed if the container reports `none` (no healthcheck) — that means the wrong Compose file, a missing override, or an unexpected container.

A pre-probe image serves neither `/readyz` nor `/healthz`, so legacy rollback validates `/api/status = 200` instead. The legacy files exist only for that case on a drained node; a permanent `404 → /api/status` fallback is forbidden because it hides a missing probe on new releases.

## Process

`docker compose up -d` after changing the tag. `docker compose down` is never a deploy or rollback step.

## Secrets

Node env files only, mode `600`, outside Git. Git holds placeholders only (`deploy/api-cvm/.env.example`).
