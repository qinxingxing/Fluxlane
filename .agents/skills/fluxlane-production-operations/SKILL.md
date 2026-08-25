---
name: fluxlane-production-operations
description: >-
  Plan, execute, verify, and roll back Fluxlane production operations across
  Cloudflare Pages, Tencent CLB, dual API/RUN nodes, TencentDB PostgreSQL, and
  TencentDB Redis. Use for releases, node replacement, backups, recovery,
  migrations, scaling, capacity decisions, and production changes where
  continuity and billing integrity matter.
---

# Fluxlane Production Operations

Prioritize avoiding interruption, billing inconsistency, and simultaneous loss of both nodes in a service.

## Start every task

1. Read [references/architecture.md](references/architecture.md) and verify live state.
2. Classify and print `CHANGE PLAN` using [references/change-control.md](references/change-control.md).
3. Load only the relevant procedure:
   - Application, Nginx, CLB, nodes, or Pages: [references/releases.md](references/releases.md)
   - PostgreSQL/Redis backup, recovery, migration, or resizing: [references/data-operations.md](references/data-operations.md)
   - Monitoring or expansion: [references/capacity.md](references/capacity.md)
4. Resolve exact targets, versions, health, backup state, and rollback artifacts.
5. Obtain explicit authorization immediately before mutation unless the request already authorizes that exact change.

Read-only investigation does not authorize deployment, restart, CLB, DNS, database, or rollback mutations.

## Invariants

- GitHub is the only code source. Build a clean explicit commit on a current CLB node or approved CI; never use retired legacy servers.
- Deploy an explicit SHA or immutable image tag, never an unpinned branch result.
- Peers share PostgreSQL `fluxlane_prod` and Redis DB `0`; local databases are not production state.
- Change one major variable at a time. Never update/restart both nodes of one service together.
- Remove one node from traffic, drain, deploy, require `/readyz=200`, rejoin, observe, then touch its peer.
- CLB uses `/readyz`; TCP-open is insufficient.
- Drain RUN Streaming/SSE, initially 120 seconds unless observed duration requires more.
- Stop on ambiguity, unhealthy surviving peer, failed backup, missing rollback, unexplained 5xx, or Billing inconsistency.
- Prefer rollback over degraded continuation. If rollback fails, leave the node out and stop.
- Do not combine application and database scaling when measuring impact.

## Health

- `/healthz`: process liveness only; no PostgreSQL, Redis, Provider, auth, Session, rate limit, Billing, Usage, or mutation.
- `/readyz`: initialization complete and accepting work. It excludes shared PostgreSQL, Redis, and Providers to avoid evicting all nodes together.
- Monitor shared dependencies separately; readiness 200 is not end-to-end Billing/Provider proof.

Probe implementations live in `router/health.go`. CLB and local Docker healthchecks must still be verified live; committed templates can drift.

## Execute and report

Preserve old image/commit/config. Monitor the surviving peer, CLB backend count, 5xx, latency, restart/OOM, PostgreSQL, and Redis. Keep secrets out of output, commits, and images. Record timestamps, targets, versions, health, rollback decisions, and anomalies.

Finish with `CHANGE RESULT`: outcome, resources, old/new versions, health, CLB, 5xx and P95/P99, PostgreSQL, Redis, rollback, risks, and next action. End with exactly `PASS`, `PASS WITH RISK`, `ROLLBACK`, or `BLOCKED`.

Verify observable behavior through real CLB entries and individual nodes; syntax alone is not success.
