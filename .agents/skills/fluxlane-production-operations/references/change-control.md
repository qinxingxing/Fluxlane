# Change control

Risk:

- `LOW`: static copy or monitoring
- `MEDIUM`: one-node app, Nginx, or CLB
- `HIGH`: full API/RUN rollout, Redis, or PostgreSQL specification
- `CRITICAL`: schema, Billing, migration/recovery, Provider key, or payment

HIGH/CRITICAL require a relevant verified backup and a written rollback.

```text
CHANGE PLAN
Goal:
Scope:
Risk level:
Current healthy nodes:
Source commit/image:
Backup status:
Rollback plan:
Expected interruption:
Preflight evidence:
Authorization status:
```

## Forbidden automatic actions

Never automatically:

- delete databases, Redis, backups, old databases, or CVMs
- change balances/Billing in bulk
- change Provider/payment secrets
- run irreversible schema changes
- restart both peers
- switch DNS
- continue with an unhealthy peer or financial inconsistency

Read-only investigation does not authorize deployment, restart, CLB, DNS, database, or rollback mutations. Obtain explicit authorization immediately before mutation unless the request already authorizes that exact change.

## Rollback

Rollback triggers: persistent readiness/CLB failure, material 5xx, panic, exit/restarts/OOM, PostgreSQL/Redis failure, critical login/balance/Token regression, RUN/Streaming regression, or Billing/Usage mismatch.

Use the saved previous image. Do not rebuild an old commit. Detach → pin previous Tag → apply readyz-legacy override if the old image has no `/readyz` → `docker compose up -d` → probes → smoke → rejoin. Never roll two nodes of one service together. Never `compose down` as the rollback. Do not let an old binary write production if schema moved forward.

If rollback fails, keep the node out, preserve evidence, output `ROLLBACK FAILED`, end `BLOCKED`.

Prefer rollback over degraded continuation. Full text: `docs/operations/ROLLBACK_WORKFLOW.md`.

```text
CHANGE RESULT
Outcome:
Modified resources:
Old version:
New version:
Health checks:
CLB state:
5xx and latency:
PostgreSQL:
Redis:
Rollback:
Remaining risks:
Final status: PASS | PASS WITH RISK | ROLLBACK | BLOCKED
```

End with exactly one of: `PASS`, `PASS WITH RISK`, `ROLLBACK`, or `BLOCKED`.
