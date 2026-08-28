# Shared production Compose rules

Used by `deploy/api/` and `deploy/run/`. Historical running template remains `deploy/api-cvm/` until the first `prod-` Tag is loaded on a node.

## Image

```text
image: fluxlane/new-api:<release-tag>
pull_policy: never
```

The Tag is the annotated Git Tag. Load the tarball from `/home/codex/releases/<release-tag>/` before `compose up`. Do not `docker build` on the node. Do not use `latest`.

## Health

Probe the app container, not host Nginx:

```text
wget -qO- http://127.0.0.1:3000/readyz
```

CLB must use `/readyz` as well. `/healthz` is liveness only.

Old images without `/readyz` need a versioned override (healthcheck → `/api/status`) only on a drained node. Do not leave a permanent 404→`/api/status` fallback in Nginx.

## Process

`docker compose up -d` after changing the Tag. Never `compose down` for deploy or rollback.

## Secrets

Node env file only (mode 600). Nothing in Git except placeholders in `deploy/api-cvm/.env.example`.
