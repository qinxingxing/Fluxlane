# Release scripts

Run on the development host `43.160.247.94` as `codex`. Never on API/RUN nodes.

| Script | Purpose |
|---|---|
| `build-release.sh <prod-tag>` | Verify the tag is annotated and on `main`, create a clean worktree, write `VERSION`, build the image **once** with `GIT_COMMIT`, assert the binary reports tag and commit, export `.tar.zst` + `.sha256`, write `release-manifest.json` |
| `verify-artifact.sh <prod-tag> [--loaded] [--release-gate]` | Re-check checksum, manifest identity, secret-looking values, quantified risk acceptance, rollback artifact; `--loaded` compares Image ID, binary SHA256, and reported commit of the local image; `--release-gate` requires `candidate_result` to be `RELEASE CANDIDATE PASS` |
| `record-production.sh <prod-tag> "API-1,API-2,..."` | After `PRODUCTION RELEASE PASS`, write `releases/current-production.json`, which is the rollback source of truth for the next build |

All three fail closed: any failed step exits non-zero and does not continue.

`build-release.sh` creates `/home/codex/build` and `/home/codex/releases` if missing, then refuses to run when the per-tag artifact already exists — a published tag is never rebuilt. If a rebuild is genuinely required, cut a new tag.

## Rollback target

`build-release.sh` records `rollback_tag` from `releases/current-production.json` or from `FLUXLANE_ROLLBACK_TAG`. It never guesses from Git tag creation time: a tag can exist without ever having been deployed, or can belong to an abandoned candidate. If the recorded tag has no artifact on disk, the build stops.

Before the first recorded production release there is **no** unified rollback tag. The four nodes hold per-node images of `3c52e436` with different Image IDs; keep them as node-level emergency fallbacks and record each Image ID. Do not present them as one previous version.

## Risk gate

Each `known_risks` entry must carry numeric `accepted_max_overdraft_quota`, `observed_max_overdraft_quota`, and `test_model_charge_quota`, plus top-level `risk_accepted_by` and `risk_accepted_at`. `verify-artifact.sh` compares absolute values (`|observed| <= |accepted|`) so a credit recorded as a negative number cannot pass by being numerically smaller.

Dependencies: `docker`, `zstd`, `sha256sum`, `jq`, `git`. Node-side `deploy/*/deploy.sh` and `rollback.sh` also require `jq`, since release identity verification is mandatory rather than best-effort.

Environment overrides (defaults shown): `FLUXLANE_REPO_DIR=/home/codex/workspace/Fluxlane`, `FLUXLANE_BUILD_ROOT=/home/codex/build`, `FLUXLANE_RELEASE_ROOT=/home/codex/releases`, `FLUXLANE_IMAGE_REPO=fluxlane/new-api`, `FLUXLANE_MIN_FREE_PERCENT=20`.

Neither script reads `/etc/fluxlane-*.env`, production PostgreSQL, or Redis.

## Runtime identity

`common.Version` and `common.GitCommit` are injected by ldflags through the Dockerfile `GIT_COMMIT` build arg. A deployed node exposes both:

- `GET /api/status` → `data.version`, `data.git_commit`
- `/new-api --version` → tag on line 1, `commit <full-sha>` on line 2

Do **not** set a `VERSION` environment variable on production nodes: `common.InitEnv` lets it override the compiled tag, which would break artifact verification.
