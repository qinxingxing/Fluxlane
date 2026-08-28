# Fluxlane rollback workflow

Use the **saved previous image**. Do not `git checkout` an old commit and rebuild. Do not `docker compose down` as the rollback (the historical `deploy/api-cvm/rollback-api.sh` is not this procedure).

## When

Persistent `/readyz` or CLB failure, material 5xx, panic/restarts/OOM, PostgreSQL/Redis failure, login/balance/Token regression, RUN/Streaming regression, Billing/Usage mismatch, or Test Agent `PRODUCTION RELEASE FAIL — ROLLBACK RECOMMENDED` plus user approval.

## Schema gate

If `schema_model_tree_sha` of the new Tag differs from the old Tag, an old binary may not be safe against AutoMigrate-forwarded tables. Stop and get user approval before an old image writes `fluxlane_prod`.

## Per node (never two of one service)

```text
Detach CLB
→ drain (RUN SSE 120s unless observed otherwise)
→ pin previous Release Tag in Compose (same tarball already on the node, or load from /home/codex/releases/<old-tag>/)
→ if old image has no /readyz: versioned healthcheck override to /api/status and, if needed, temporary Nginx readyz-legacy only on the drained node
→ docker compose up -d
→ /healthz, Docker healthy; /readyz=200 or documented legacy probe
→ smoke
→ rejoin CLB
→ observe
```

Keep the failed new node out if rollback of that node fails (`ROLLBACK FAILED` / `BLOCKED`). Do not overwrite production databases for a drill.

## Forbidden

- Rebuild from an old commit
- Simultaneous rollback of both API or both RUN nodes
- `compose down` as the only rollback
- Flushing Redis or restoring PostgreSQL over production without an explicit data-recovery plan (`references/data-operations.md`)
