# Fluxlane rollback workflow

Use the **saved previous image**. Do not `git checkout` an old commit and rebuild. Do not `docker compose down` as the rollback (the historical `deploy/api-cvm/rollback-api.sh` is not this procedure).

## When

Persistent `/readyz` or CLB failure, material 5xx, panic/restarts/OOM, PostgreSQL/Redis failure, login/balance/Token regression, RUN/Streaming regression, Billing/Usage mismatch, or Test Agent `PRODUCTION RELEASE FAIL — ROLLBACK RECOMMENDED` plus user approval.

## Schema gate

`schema_code_sha256` in the manifest covers every path and blob under `model/` at that tag, including the explicit migrations in `model/main.go`. AutoMigrate only moves the schema forward.

If the current tag and the rollback target differ on that hash, an old binary would run against already-migrated tables. `deploy/*/rollback.sh` stops unless `FLUXLANE_SCHEMA_APPROVED=yes` is set, which must only be set after the user accepts that risk. The same gate applies when a manifest is missing and the comparison cannot be made.

## Target selection

Roll back to the tag recorded in `releases/current-production.json`, or to a tag the user names explicitly. Do not pick "the newest `prod-` tag": a tag may exist without ever having been deployed.

## Per node (never two of one service)

```bash
# Node detached from CLB and drained first.
FLUXLANE_CLB_DETACHED=yes deploy/api/rollback.sh prod-YYYYMMDD-<previous>
# or
FLUXLANE_CLB_DETACHED=yes deploy/run/rollback.sh prod-YYYYMMDD-<previous>
```

The script records current state, checks the schema gate, verifies the artifact checksum and manifest, loads the image if needed, compares Image ID, binary SHA256, and reported commit, then `docker compose up -d`. Any missing manifest, missing `jq`, or mismatch stops the rollback.

### Images that predate the probes

A pre-probe image serves neither `/readyz` nor `/healthz`, so add:

```bash
FLUXLANE_LEGACY_READYZ=yes FLUXLANE_NGINX_SITE=/etc/nginx/conf.d/<live-site>.conf
```

Then the script:

- applies the role override `deploy/common/docker-compose.readyz-legacy-api.yml` or `-run.yml` (literal service keys — Compose does not substitute variables in mapping keys);
- backs up the live Nginx site, installs the **complete** legacy site (`deploy/api/nginx-readyz-legacy.conf` or `deploy/run/nginx-readyz-legacy.conf`), runs `nginx -t`, reloads, and restores the backup if anything fails. A bare `location` block cannot live in `conf.d`, so a snippet is not used;
- validates `/api/status = 200` instead of `/healthz` and `/readyz`.

Both legacy files are rollback-only. Restore the normal site and probe before the node carries pooled traffic under a normal release; the backup path is printed at the end of the run.

Then: smoke → rejoin CLB → observe.

## Before the first tagged release

The four nodes currently run per-node images of `3c52e436` with different Image IDs. They are node-level emergency fallbacks only, not a unified previous version, and `deploy/*/rollback.sh` cannot target them because they have no `prod-` tag, artifact, or manifest. A pre-tag revert is a manual per-node action on a drained node. Record each node's current Image ID before the first release.

Keep the node out if its rollback fails (`ROLLBACK FAILED` / `BLOCKED`). Do not overwrite production databases for a drill.

## Forbidden

- Rebuild from an old commit
- Simultaneous rollback of both API or both RUN nodes
- `compose down` as the only rollback
- Leaving a permanent `404 → /api/status` fallback in the default Nginx site
- Flushing Redis or restoring PostgreSQL over production without an explicit data-recovery plan (`.agents/skills/fluxlane-production-operations/references/data-operations.md`)
