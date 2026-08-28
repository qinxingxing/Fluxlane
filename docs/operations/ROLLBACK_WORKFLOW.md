# Fluxlane rollback workflow

Use the **saved previous image**. Do not `git checkout` an old commit and rebuild. Do not `docker compose down` as the rollback (the historical `deploy/api-cvm/rollback-api.sh` is not this procedure).

## When

Persistent `/readyz` or CLB failure, material 5xx, panic/restarts/OOM, PostgreSQL/Redis failure, login/balance/Token regression, RUN/Streaming regression, Billing/Usage mismatch, or Test Agent `PRODUCTION RELEASE FAIL — ROLLBACK RECOMMENDED` plus user approval.

## Schema gate

`schema_code_sha256` in the manifest covers every path and blob under `model/` at that tag, including the explicit migrations in `model/main.go`. AutoMigrate only moves the schema forward.

If the current tag and the rollback target differ on that hash, an old binary would run against already-migrated tables. `deploy/*/rollback.sh` stops unless `FLUXLANE_SCHEMA_APPROVED=yes` is set, which must only be set after the user accepts that risk. The same gate applies when a manifest is missing and the comparison cannot be made.

## Per node (never two of one service)

```bash
# Node detached from CLB and drained first.
FLUXLANE_CLB_DETACHED=yes deploy/api/rollback.sh prod-YYYYMMDD-<previous>
# or
FLUXLANE_CLB_DETACHED=yes deploy/run/rollback.sh prod-YYYYMMDD-<previous>
```

The script records current state, checks the schema gate, loads and verifies the previous artifact, `docker compose up -d`, waits for health, then requires `/healthz` and `/readyz` plus reported identity.

For a target image that predates `/readyz`, add `FLUXLANE_LEGACY_READYZ=yes`. That applies `deploy/common/docker-compose.readyz-legacy.yml` (healthcheck → `/api/status`) and, if the CLB probe must also be satisfied on that drained node, install `deploy/common/nginx-readyz-legacy.conf` temporarily. Both are rollback-only and must be removed before the node carries pooled traffic under a normal release.

Then: smoke → rejoin CLB → observe.

Keep the node out if its rollback fails (`ROLLBACK FAILED` / `BLOCKED`). Do not overwrite production databases for a drill.

## Forbidden

- Rebuild from an old commit
- Simultaneous rollback of both API or both RUN nodes
- `compose down` as the only rollback
- Leaving a permanent `404 → /api/status` fallback in the default Nginx site
- Flushing Redis or restoring PostgreSQL over production without an explicit data-recovery plan (`.agents/skills/fluxlane-production-operations/references/data-operations.md`)
