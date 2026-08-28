# Release scripts

Run on the development host `43.160.247.94` as `codex`. Never on API/RUN nodes.

| Script | Purpose |
|---|---|
| `build-release.sh <prod-tag>` | Verify the tag is annotated and on `main`, create a clean worktree, write `VERSION`, build the image **once** with `GIT_COMMIT`, assert the binary reports tag and commit, export `.tar.zst` + `.sha256`, write `release-manifest.json` |
| `verify-artifact.sh <prod-tag> [--loaded]` | Re-check checksum, manifest identity, secret-looking values, risk acceptance, rollback artifact; with `--loaded`, compare Image ID, binary SHA256, and reported commit of the locally loaded image |

Both fail closed: any failed step exits non-zero and does not continue.

`build-release.sh` refuses to run when the artifact already exists — a published tag is never rebuilt. If a rebuild is genuinely required, cut a new tag.

Dependencies: `docker`, `zstd`, `sha256sum`, `jq`, `git`.

Environment overrides (defaults shown): `FLUXLANE_REPO_DIR=/home/codex/workspace/Fluxlane`, `FLUXLANE_BUILD_ROOT=/home/codex/build`, `FLUXLANE_RELEASE_ROOT=/home/codex/releases`, `FLUXLANE_IMAGE_REPO=fluxlane/new-api`, `FLUXLANE_MIN_FREE_PERCENT=20`.

Neither script reads `/etc/fluxlane-*.env`, production PostgreSQL, or Redis.

## Runtime identity

`common.Version` and `common.GitCommit` are injected by ldflags through the Dockerfile `GIT_COMMIT` build arg. A deployed node exposes both:

- `GET /api/status` → `data.version`, `data.git_commit`
- `/new-api --version` → tag on line 1, `commit <full-sha>` on line 2

Do **not** set a `VERSION` environment variable on production nodes: `common.InitEnv` lets it override the compiled tag, which would break artifact verification.
