# Fluxlane testing workflow

Test Agent only. No business-code edits, no production config, no balance/DB/Redis mutations, no self-release.

Skill companion: `.agents/skills/fluxlane-production-operations/references/testing.md`.

## Gates

| Gate | Output | Blocks |
|---|---|---|
| Development commit | PASS / FAIL | Merge recommendation |
| Release candidate (the tarball) | `RELEASE CANDIDATE PASS` / `FAIL` | Production roll |
| After production traffic | `PRODUCTION RELEASE PASS` / `PRODUCTION RELEASE FAIL — ROLLBACK RECOMMENDED` | Remaining nodes / keep-live |

Rebuild after tests voids PASS.

## Release candidate minimum

### API

`/healthz`, `/readyz`, `/api/status` (Tag and Git identity), login/logout, email verification, Token management, Channel/model/logs, Console pages, API-1 vs API-2.

### RUN

Unauthenticated `/v1/models` → 401; Mock non-stream; Mock stream; Usage; `request_id`; errors; Provider failure; RUN-1 vs RUN-2.

### Billing

Pre-consume and settle; consume logs = successful charges; multi-account isolation; multi-Token shared user wallet; failures do not charge.

Known product risk (do not treat as unexpected FAIL if already documented): concurrent in-flight settles can overdraft a small wallet (observed Stage 5: u09/u10 each **−40,000** quota). Serial Token remain = N×40000 does gate exactly N successes.

### Infrastructure

PostgreSQL/Redis from the path under test; no OOM/unexpected restart; Nginx; no new 500/502/503; previous image tarball present.

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

Keep client JSONL with client/server `request_id`. Never store Admin Token, user API keys, Provider keys, or passwords. Stop on 5xx, status=0, CLB drop, or Billing mismatch. Expected 401 on exhausted Token is not a stop.

## Time windows

Do not run Mock load tests during Docker builds. Do not change Mock usage during Billing tests. See `DEVELOPMENT_SERVER.md`.
