---
name: fluxlane-production-operations
description: >-
  Plan, execute, verify, and roll back Fluxlane development, testing, and
  production releases across GitHub, the development host 43.160.247.94,
  Cloudflare Pages, Tencent CLB, dual API/RUN nodes, TencentDB PostgreSQL, and
  TencentDB Redis. Use for Git workflow, one-shot image builds, artifact
  distribution without a registry, rolling four-node deploys, rollback, schema
  version notes, QA windows, and Cursor/Codex/ZCode handoff.
---

# Fluxlane Production Operations

Prioritize avoiding interruption, billing inconsistency, and simultaneous loss of both nodes in one service.

Canonical written procedures (no secrets):

- `docs/operations/DEVELOPMENT_WORKFLOW.md`
- `docs/operations/TESTING_WORKFLOW.md`
- `docs/operations/RELEASE_WORKFLOW.md`
- `docs/operations/ROLLBACK_WORKFLOW.md`
- `docs/operations/DEVELOPMENT_SERVER.md`
- `docs/operations/RELEASE_MANIFEST.example.json`

## Tool collaboration

Shared Git workspaces on `43.160.247.94`:

- Cursor and Codex: `/home/codex/workspace/Fluxlane`
- ZCode only: `/home/codex/workspace/Fluxlane-zcode`
- Production branch: `main`. Do not develop on `main`.

1. Cursor implements and commits business/ops code.
2. Codex reviews architecture and code; default read-only; does not mutate Git while Cursor is committing.
3. Cursor and Codex must not run overlapping Git mutations (`add`, `commit`, `checkout`, `merge`, `rebase`, `reset`) on the shared worktree.
4. Codex starts a review with `git status`. If the tree is dirty, stop and report; do not clean, overwrite, or stage.
5. ZCode tests only in `Fluxlane-zcode`; it does not change business code or production config.
6. Nobody merges or force-pushes `main` without explicit user approval.
7. Do not use `git reset --hard`, `git clean`, force-push, or delete another tool's worktree.

Install this skill on the development host **only from merged `main`**; an unmerged branch or draft PR is a proposal, not an operating rule.

```text
/home/codex/workspace/Fluxlane/.agents/skills/fluxlane-production-operations/
→ /home/codex/.codex/skills/fluxlane-production-operations/
→ /home/codex/.cursor/skills/fluxlane-production-operations/
```

Never copy secrets into the skill.

## Start every task

1. Follow **Tool collaboration** before any Git mutation, review, branch switch, or worktree change.
2. Read [references/architecture.md](references/architecture.md) and verify live state.
3. Classify and print `CHANGE PLAN` using [references/change-control.md](references/change-control.md).
4. Load only the relevant procedure:
   - Git, branches, Tag, VERSION: [references/git-workflow.md](references/git-workflow.md) and [references/versioning.md](references/versioning.md)
   - Development host, build/test windows: [references/development-server.md](references/development-server.md)
   - Test Agent handoff and gates: [references/testing.md](references/testing.md)
   - Application, Nginx, CLB, nodes, or Pages: [references/releases.md](references/releases.md)
   - PostgreSQL/Redis backup, recovery, migration, or resizing: [references/data-operations.md](references/data-operations.md)
   - Monitoring or expansion: [references/capacity.md](references/capacity.md)
5. Resolve exact targets, versions, health, backup state, and rollback artifacts.
6. Obtain explicit user authorization immediately before mutation unless the request already authorizes that exact change.

Read-only investigation does not authorize deployment, restart, CLB, DNS, database, Tag, merge to `main`, or rollback mutations.

The Development Agent must not declare tests passed. The Test Agent must not modify business code, production config, user balances, PostgreSQL, Redis, or perform a release.

## Invariants

- Windows is only the SSH launch point. Git, builds, and worktrees run on `43.160.247.94` as `codex`.
- GitHub SSH uses `/home/codex/.ssh/id_ed25519` with `IdentitiesOnly=yes`. Never print, copy, or commit that key.
- GitHub is the only code source. `main` is the only production baseline.
- One production Tag (`prod-YYYYMMDD-<short-sha>`) maps to one commit on `main`. Tags are never moved or overwritten.
- Build once with `scripts/release/build-release.sh <tag>`: clean worktree under `/home/codex/build/<tag>/`, Tag into `VERSION`, full commit into `common.GitCommit` via the Dockerfile `GIT_COMMIT` arg. Image: `fluxlane/new-api:<tag>`. Verify with `scripts/release/verify-artifact.sh`.
- A deployed node must report both identities: `/api/status` `version` + `git_commit`, and `/new-api --version`. Never set a `VERSION` env var on production nodes; it overrides the compiled Tag.
- Without a reachable private registry, distribute `docker save | zstd`, checksum, `docker load` on each node, pin Compose to that Tag with `pull_policy: never`. Never retarget nodes to another node's local Image ID. Never rebuild on API/RUN nodes.
- Node deploys and rollbacks run `deploy/api/{deploy,rollback}.sh` or `deploy/run/{deploy,rollback}.sh`, which require `FLUXLANE_CLB_DETACHED=yes`. Identity verification fails closed: `jq`, manifest, tarball, checksum, Image ID, binary SHA256, tag, and commit must all be present and matching, even when an image with that name already exists.
- The rollback target comes from `releases/current-production.json` (written by `scripts/release/record-production.sh`) or an explicit `FLUXLANE_ROLLBACK_TAG`. Never infer it from Git tag creation time. Before the first recorded release there is no unified rollback tag; the four per-node `3c52e436` images have different Image IDs and are node-level emergency fallbacks only.
- Pre-probe images serve neither `/readyz` nor `/healthz`: legacy rollback validates `/api/status`, uses the per-role Compose override (literal service keys, since Compose does not substitute variables in mapping keys), and swaps a **complete** Nginx site after a backup plus `nginx -t`, never a bare `location` in `conf.d`.
- Keep the node identity that already runs: API container `fluxlane-api` + `/etc/fluxlane-api.env`; RUN container `new-api` + `/opt/new-api/secrets/runtime.env`. Renaming a container or moving an env file is a separate approved change with an enumerated list of affected scripts.
- Four production nodes run the same artifact. Production nodes never develop, commit, or `docker build`.
- Test PASS is not authorization to go live. User approval is required to merge `main`, create a production Tag, and roll production.
- Roll API and RUN separately. Keep one healthy node of that service in the pool. Order default: API-1 → API-2 → RUN-1 → RUN-2.
- CLB uses `/readyz`. TCP-open is insufficient. Compose healthchecks probe `127.0.0.1:3000/readyz` inside the app container.
- Drain RUN Streaming/SSE, initially 120 seconds unless observed duration requires more.
- Do not `docker compose down` as a deploy or rollback step. Use `docker compose up -d` after switching the Tag.
- Schema today is GORM AutoMigrate on start. Record `schema_code_sha256` (every path+blob under `model/`, including `model/main.go` migrations) in the manifest. Rollback across a differing hash requires user acceptance recorded as `FLUXLANE_SCHEMA_APPROVED=yes`.
- A concurrent Billing overdraft is not an automatic pass. Each `known_risks` entry needs numeric `accepted_max_overdraft_quota`, `observed_max_overdraft_quota`, and `test_model_charge_quota`, plus `risk_accepted_by` and `risk_accepted_at`, with `|observed| <= |accepted|`. `verify-artifact.sh --release-gate` also requires `candidate_result` to be `RELEASE CANDIDATE PASS`.
- Stop on ambiguity, unhealthy surviving peer, failed backup, missing rollback artifact, unexplained 5xx, or Billing inconsistency.
- Prefer rollback of the saved previous image over degraded continuation.
- Do not build Docker images during QA Mock load tests. Do not change Mock usage during Billing tests. Do not prune Docker images needed for rollback.

## Health

- `/healthz`: process liveness only; no PostgreSQL, Redis, Provider, auth, Session, rate limit, Billing, Usage, or mutation.
- `/readyz`: initialization complete and accepting work. It excludes shared PostgreSQL, Redis, and Providers to avoid evicting all nodes together.
- Monitor shared dependencies separately; readiness 200 is not end-to-end Billing/Provider proof.

Probe implementations live in `router/health.go`. Live CLB and Compose files can still drift from Git; verify both.

## Execute and report

Preserve old image/commit/config/manifest. Monitor the surviving peer, CLB backend count, 5xx, latency, restart/OOM, PostgreSQL, and Redis. Keep secrets out of output, commits, images, skills, and manifests. Record timestamps, targets, versions, health, rollback decisions, and anomalies.

Finish application changes with `CHANGE RESULT` and exactly one of `PASS`, `PASS WITH RISK`, `ROLLBACK`, or `BLOCKED`.

Test Agent finishes a candidate with `RELEASE CANDIDATE PASS` or `RELEASE CANDIDATE FAIL`. After production traffic, `PRODUCTION RELEASE PASS` or `PRODUCTION RELEASE FAIL — ROLLBACK RECOMMENDED`.
