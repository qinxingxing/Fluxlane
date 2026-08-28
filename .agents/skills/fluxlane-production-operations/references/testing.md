# Test Agent handoff and gates

The Test Agent does not modify business code, production config, user balances, PostgreSQL, Redis, or perform releases.

## When a development commit arrives

1. Pin the commit SHA.
2. Classify: functional, regression, Billing, performance, security. Do not mix load profiles.
3. Produce PASS or FAIL with client evidence (request_id maps, no secrets).

Only PASS may recommend merge to `main`.

## Release candidate (same artifact that will ship)

The Test Agent verifies the **loaded image**, not a later rebuild.

Minimum API: `/healthz`, `/readyz`, `/api/status` version/Tag, login/logout, email verification, Token, Channel/model/logs, Console pages, API-1/API-2.

Minimum RUN: unauthenticated `/v1/models` → 401; Mock non-stream and stream; Usage; request_id; errors; Provider failure behavior; RUN-1/RUN-2.

Minimum Billing: pre-consume and settle; consume log count = successful bills; multi-account isolation; multi-Token shared wallet; failed requests do not charge; known concurrent overdraft (Stage 5: u09/u10 −40000 when many in-flight requests settle 40000 against a small wallet) written into the report.

Infrastructure: PostgreSQL/Redis reachability from the test path in use; no OOM/unexpected restart; Nginx; no new 500/502/503; rollback artifact present.

Output `RELEASE CANDIDATE PASS` or `RELEASE CANDIDATE FAIL`. FAIL blocks production.

## After production roll

Formal entries:

```text
https://api.fluxlane.ai
https://run.fluxlane.ai/v1
https://www.fluxlane.ai
https://console.fluxlane.ai
https://doc.fluxlane.ai
```

Smoke plus Billing single-request reconcile, CLB distribution, 5xx, PostgreSQL/Redis, Image ID equality.

Output `PRODUCTION RELEASE PASS` or `PRODUCTION RELEASE FAIL — ROLLBACK RECOMMENDED`.

## Stop conditions (client)

5xx, status=0, CLB disconnect, duplicate/missing request_id on success paths. Expected 401 on exhausted Token (serial Stage 6 style) is not a stop. Unexplained Billing mismatch is a stop.
