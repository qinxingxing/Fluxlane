# Test Agent handoff and gates

The Test Agent does not modify business code, production config, user balances, PostgreSQL, Redis, or perform releases.

## When a development commit arrives

1. Pin the commit SHA.
2. Classify: functional, regression, Billing, performance, security. Do not mix load profiles.
3. Produce PASS or FAIL with client evidence (request_id maps, no secrets).

Only PASS may recommend merge to `main`.

## Where candidate checks run (no pre-production environment)

1. **Development host**: load the tarball and start the candidate against a local database and QA Mock. Proves startup, `/healthz`, `/readyz`, `/api/status` tag + `git_commit`, `/new-api --version`, Mock stream/non-stream, Usage, `request_id`, clean migration on a scratch database.
2. **Current production version**: read-only regression baseline on the running release.
3. **One drained production node with the candidate loaded, still out of the CLB pool** (user approval required): real env file, real PostgreSQL/Redis, no pooled traffic. Login, Token, Channel/model/logs, Console, Mock stream/non-stream, single-request Billing reconcile, reported identity.
4. **After rejoin**: public entries, per node as the roll proceeds.

That layering is how "verify production compatibility before release" coexists with "do not disturb production".

## Release candidate (same artifact that will ship)

The Test Agent verifies the **loaded image**, not a later rebuild. Re-check identity with `scripts/release/verify-artifact.sh <tag> --loaded`.

Minimum API: `/healthz`, `/readyz`, `/api/status` version/Tag and `git_commit`, login/logout, email verification, Token, Channel/model/logs, Console pages, API-1/API-2.

Minimum RUN: unauthenticated `/v1/models` → 401; Mock non-stream and stream; Usage; request_id; errors; Provider failure behavior; RUN-1/RUN-2.

Minimum Billing: pre-consume and settle; consume log count = successful bills; multi-account isolation; multi-Token shared wallet; failed requests do not charge.

Concurrent overdraft is **not** an automatic pass. `RELEASE CANDIDATE PASS` requires all three: the manifest `known_risks` records the maximum observed overdraft quota and the test model charge per request; the user accepted it (`risk_accepted_by`, `risk_accepted_at` filled); and this candidate's observed overdraft does not exceed that maximum. Otherwise FAIL. Reference: Stage 5, 2026-08-27, u09/u10 at 200000 remaining, 6 concurrent successes at 40000 → −40000 each. `verify-artifact.sh` fails closed on unaccepted risks.

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
