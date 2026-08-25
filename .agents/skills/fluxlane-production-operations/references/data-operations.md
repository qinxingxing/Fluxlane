# PostgreSQL and Redis

Peers share TencentDB PostgreSQL `fluxlane_prod` and Redis DB `0`. Local databases on API/RUN nodes are not production state.

## Backup policy

Use TencentDB daily full backup, WAL/log incremental backup, and about 30-day retention subject to policy/cost.

Before schema, Billing, major-version, repair, migration, or recovery, require a manual full backup with status `SUCCESS`.

HIGH/CRITICAL data changes require that verified backup and a written rollback. Stop if the backup failed or is missing.

## Recovery

Use PITR into a new temporary instance, never over production. Reconcile users, tokens, balances, usage, Billing, and payments; restoration success alone is not financial consistency.

Redis snapshots do not replace the PostgreSQL ledger.

## Migration

Migration prefers Tencent DTS full plus incremental sync:

1. Verify scope/compatibility and backup.
2. Sync and reduce lag near zero.
3. Enter approved maintenance blocking registration, recharge, Token consumption, new model requests, and Billing writes.
4. Drain requests/Streaming.
5. Reconcile.
6. Change one target through versioned secrets.
7. Start one node and test readiness/data/Billing.
8. Roll peers.
9. Restore traffic only with evidence.

Keep the old DB at least seven days. Once the new DB accepts registrations, recharge, Billing, Usage, Token, or balance writes, never blindly switch back; plan reverse sync/reconciliation.

Never automatically delete databases, Redis, backups, old databases, or CVMs.

Committed private targets in `deploy/api-cvm/` (verify live; never print credentials):

- PostgreSQL `10.20.1.11:5432` / `fluxlane_prod`
- Redis `10.20.1.13:6379` / DB `0`
- Deploy scripts require `SQL_DSN` and `REDIS_CONN_STRING` to match those targets.

## PostgreSQL resize

PostgreSQL resize requires sustained waits/locks, idle-in-transaction growth, long transactions, CPU/storage pressure, or correlated latency. Change separately from RUN.

Historical 2C4G baseline had low waits at 500 VU; verify before considering 4C8G. Do not combine application and database scaling when measuring impact.

## Redis

Redis DB 0 may contain cache, Session, rate limits, locks, idempotency, or in-flight reservations. Classify before migration/flush.

Resize only for sustained CPU/memory, blocked/rejected clients, latency, eviction, or timeouts. Error replies alone are insufficient.
