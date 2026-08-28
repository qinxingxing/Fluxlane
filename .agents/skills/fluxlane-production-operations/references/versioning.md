# Tag, VERSION, runtime SHA, and schema

## Identities that must match

| Identity | Source | Where it must appear |
|---|---|---|
| Release Tag | `prod-YYYYMMDD-<short-sha>` | Git Tag, `VERSION` file in the build worktree, Docker image tag, Compose `image:`, release directory name |
| Full Git SHA | `git rev-parse <tag>^{}` | `release-manifest.json`, ldflags if used, `/api/status` |
| Docker Image ID | `docker image inspect` after the single build | manifest, node `docker load` verification |
| `/new-api` SHA256 | hash of the binary inside the image | manifest |
| Artifact SHA256 | `docker save \| zstd` tarball | `.tar.zst.sha256` |
| Schema baseline | sha256 over every path+blob under `model/` at the Tag, including the explicit migrations in `model/main.go` | `schema_code_sha256` in the manifest |

Four nodes must share Tag, Image ID, and binary SHA256. A matching Git SHA with different Image IDs means per-node rebuild — treat as a release defect.

## VERSION and runtime SHA

`VERSION` in Git may be empty on `main`. `scripts/release/build-release.sh` writes the Release Tag into `VERSION` in the build worktree before `docker build`, so frontend `VITE_REACT_APP_VERSION` and Go `common.Version` both equal the Tag.

The full commit is injected separately through the Dockerfile build arg `GIT_COMMIT` into `common.GitCommit`. A deployed node exposes both:

- `GET /api/status` → `data.version` (Tag) and `data.git_commit` (full SHA)
- `/new-api --version` → Tag on line 1, `commit <full-sha>` on line 2

The build script fails if the built binary does not report both, so an unlabeled image cannot become a release.

Do not set a `VERSION` environment variable on production nodes: `common.InitEnv` lets it override the compiled Tag, which would defeat artifact verification.

## Schema

There is no `migrations/` directory. Startup runs GORM `AutoMigrate` plus a few explicit `ALTER`s in `model/main.go`.

Consequences:

- Forward: starting a new Tag can add columns. That is a one-way production schema change.
- Reverse: loading an older image does **not** drop columns. An old binary may fail or mis-bill if it cannot tolerate the new schema.
- The release manifest records `schema_code_sha256` and `schema_notes`. It hashes each path together with its blob SHA under `model/`, so a change to `model/main.go` migrations, a new model file, or a moved file all change the value. `deploy/*/rollback.sh` compares the two manifests and refuses to proceed unless `FLUXLANE_SCHEMA_APPROVED=yes` records explicit user acceptance.
- Cloud database backups are not a commit↔schema map. Do not treat backup time as schema version.

Do not invent a second migration framework in a hotfix. Document compatibility in the manifest.

## Known Git vs live drift (until the first `prod-` rollout)

- `deploy/api-cvm/docker-compose.yml` still pins `fluxlane/api-control:eaae4af5` and healthchecks `/api/status`.
- HEAD on `main` (`3c52e436` at skill update) includes `/readyz`.
- New templates live in `deploy/api/`, `deploy/run/`, `deploy/common/` and are used only after a tagged one-shot build.

Verify live Compose and CLB independently of Git.
