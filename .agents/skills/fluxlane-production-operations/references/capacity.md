# Monitoring and capacity

Collect comparable before/during/after windows. Do not combine application and database scaling when measuring impact.

## What to collect

- API/RUN: CPU, memory, load, PID, restarts, OOM, FDs, Nginx connections/4xx/5xx, New API errors, RPS, P50/P95/P99, probes.
- CLB: healthy/unhealthy, 4xx/5xx/502/503, P95/P99, node distribution.
- PostgreSQL: CPU, storage, total/active/idle/idle-in-transaction/waiting, locks, longest transaction, backups.
- Redis: CPU, memory, clients, blocked/rejected, error/auth replies, eviction, latency, pool errors.

Separate application, CLB/Nginx, Provider, and client status-0/abort failures.

`/healthz` is process liveness only. `/readyz=200` is not end-to-end Billing/Provider proof. Monitor shared PostgreSQL, Redis, and Providers separately.

## Historical envelope

Historical recommended envelope is about 450 VU / 700 RPS. About 500 VU / 780 RPS ran but is not a safety commitment.

Consider RUN expansion for:

- sustained CPU >70%
- persistent P95 degradation
- RPS near 700
- sustained concurrency near 400+

Revalidate after any material stack or load-profile change.

## Expansion choices

When RUN is the bottleneck, choose vertical or horizontal; prefer horizontal after proving statelessness. Add via the node workflow at low CLB weight and rerun the same test. Only then reassess PostgreSQL. Never scale RUN and PostgreSQL together.

Preserve enough capacity for one-node operation. Confirm peer health and single-node capacity before removing a node from traffic.

PostgreSQL resize is a separate decision. Historical 2C4G baseline had low waits at 500 VU; verify before considering 4C8G. See [data-operations.md](data-operations.md).
