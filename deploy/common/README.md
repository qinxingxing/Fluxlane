# Shared production deploy assets

Used by `deploy/api/` and `deploy/run/`. The historical single-node template stays in `deploy/api-cvm/` until a `prod-` tag is loaded on that node.

| File | Purpose |
|---|---|
| `node-lib.sh` | Shared node-side steps: tag format, drained acknowledgement, artifact load + identity verification, state recording, `compose up`, probes, schema rollback gate |
| `docker-compose.readyz-legacy.yml` | Rollback-only healthcheck override for images that predate `/readyz` |
| `nginx-readyz-legacy.conf` | Rollback-only `/readyz` → `/api/status` shim for a **drained** node; delete before rejoining CLB |

## Image

```text
image: fluxlane/new-api:<release-tag>
pull_policy: never
```

The tag is the annotated Git tag. Load the tarball from the release directory before `compose up`. Do not `docker build` on a node. Do not use `latest`.

## Health

Container healthchecks probe `http://127.0.0.1:3000/readyz` inside the app container, and CLB probes `/readyz` too. `/healthz` is liveness only. The legacy files above exist so a rollback to a pre-`/readyz` image is possible on a drained node; a permanent `404 → /api/status` fallback is forbidden because it hides a missing probe on new releases.

## Process

`docker compose up -d` after changing the tag. `docker compose down` is never a deploy or rollback step.

## Secrets

Node env files only, mode `600`, outside Git. Git holds placeholders only (`deploy/api-cvm/.env.example`).
