# Fluxlane testing workflow

Test Agent only. No business-code edits, no production config, no balance/DB/Redis mutations, no self-release.

Skill companion: `.agents/skills/fluxlane-production-operations/references/testing.md`.

## Gates

| Gate | Output | Blocks |
|---|---|---|
| Development commit | PASS / FAIL | Merge recommendation |
| Release candidate (the tarball) | `RELEASE CANDIDATE PASS` / `FAIL` | Production roll |
| After production traffic | `PRODUCTION RELEASE PASS` / `PRODUCTION RELEASE FAIL — ROLLBACK RECOMMENDED` | Remaining nodes / keep-live |

Rebuild after tests voids PASS. Re-verify identity with `scripts/release/verify-artifact.sh <tag> --loaded`.

Before the first release there is no unified previous artifact: the four nodes carry per-node images built separately from `3c52e436`, with different Image IDs. Treat those only as node-level emergency fallbacks, never as one rollback tag.

## Where each check runs

There is no pre-production environment. Split the candidate checks by what each location can prove:

### Layer 1 — development host `43.160.247.94`, no production secrets

Load the tarball and start the candidate image against a local database and the QA Mock provider on `:18080`.

Proves: image starts; `/healthz`; `/readyz`; `/api/status` `version` = tag and `git_commit` = manifest `git_sha`; `/new-api --version`; Mock non-stream and stream; Usage and `request_id`; relay 401 without a token; migration runs clean on a scratch database; no OOM.

Does not prove: production data compatibility, CLB behavior, real per-node config.

### Layer 2 — current production version, existing nodes

Regression of live behavior (login, Channel, logs, Billing single request) against the version already running, to establish the comparison baseline. Read-only for the Test Agent; no config changes.

### Layer 3 — one drained production node, candidate loaded, still out of the pool

Requires user approval. Development Agent detaches one node from CLB, drains it, and runs `deploy/<role>/deploy.sh`. The node keeps its real env file, real PostgreSQL, and real Redis, but receives **no** CLB traffic.

Test Agent then hits that node directly (node IP or a host-header request) for: login/logout, Token, Channel/model/logs, Console pages, PostgreSQL/Redis-backed reads, Mock non-stream and stream, Billing single request reconciled against `/api/log`, plus `/api/status` identity.

This is how "verify compatibility with production before release" and "do not disturb production" coexist: the node is production hardware and production data, but out of traffic. Nothing rejoins CLB until this layer passes.

### Layer 4 — after rejoin, public entries

See below. Repeat per node as the roll proceeds; API-1 → API-2 → RUN-1 → RUN-2.

## Release candidate minimum

### API

`/healthz`, `/readyz`, `/api/status` (tag + `git_commit`), login/logout, email verification, Token management, Channel/model/logs, Console pages, API-1 vs API-2.

### RUN

Unauthenticated `/v1/models` → 401; Mock non-stream; Mock stream; Usage; `request_id`; errors; Provider failure; RUN-1 vs RUN-2.

### Billing

Pre-consume and settle; consume logs = successful charges; multi-account isolation; multi-Token shared user wallet; failures do not charge.

### Known concurrency overdraft — explicit acceptance required

Concurrent in-flight requests can settle past a small remaining wallet and leave a negative balance.

`RELEASE CANDIDATE PASS` is allowed **only** when each `known_risks` entry in `release-manifest.json` carries all of:

```json
{
  "id": "concurrent-wallet-overdraft",
  "accepted_max_overdraft_quota": -40000,
  "observed_max_overdraft_quota": -40000,
  "test_model_charge_quota": 40000
}
```

plus `risk_accepted_by` and `risk_accepted_at` at the top level, and `|observed| <= |accepted|`.

`verify-artifact.sh` enforces this: it requires the three numeric fields per risk, a non-zero accepted ceiling, and compares absolute values so a credit written as a negative number cannot pass by being "smaller". `verify-artifact.sh <tag> --release-gate`, run before rolling production, additionally requires `candidate_result` to be exactly `RELEASE CANDIDATE PASS`.

A negative balance not covered by an accepted, quantified entry is `RELEASE CANDIDATE FAIL`, not an automatic pass.

Reference measurement (Stage 5, 2026-08-27): `qa-billing-u09` and `u10`, 200,000 remaining, 6 concurrent successes at 40,000 each → **−40,000** each. Serial token remain of `N × 40000` gated exactly N successes (Stage 6).

### Infrastructure

PostgreSQL/Redis from the path under test; no OOM/unexpected restart; Nginx; no new 500/502/503; previous artifact and manifest present for rollback.

## Formal post-release entries

```text
https://api.fluxlane.ai
https://run.fluxlane.ai/v1
https://www.fluxlane.ai
https://console.fluxlane.ai
https://doc.fluxlane.ai
```

Include CLB distribution and Image ID equality across the four nodes.

## Evidence

Keep client JSONL with client/server `request_id`. Never store Admin Token, user API keys, Provider keys, or passwords. Stop on 5xx, status=0, CLB drop, or Billing mismatch outside an accepted risk. Expected 401 on exhausted Token is not a stop.

## Time windows

Do not run Mock load tests during Docker builds. Do not change Mock usage during Billing tests. See `DEVELOPMENT_SERVER.md`.
