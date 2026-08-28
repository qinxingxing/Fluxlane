# Tag, VERSION, runtime SHA, and schema

## Identities that must match

| Identity | Source | Where it must appear |
|---|---|---|
| Release Tag | `prod-YYYYMMDD-<short-sha>` | Git Tag, `VERSION` file in the build worktree, Docker image tag, Compose `image:`, release directory name |
| Full Git SHA | `git rev-parse <tag>^{}` | `release-manifest.json`, ldflags if used, `/api/status` |
| Docker Image ID | `docker image inspect` after the single build | manifest, node `docker load` verification |
| `/new-api` SHA256 | hash of the binary inside the image | manifest |
| Artifact SHA256 | `docker save \| zstd` tarball | `.tar.zst.sha256` |
| Schema baseline | Git tree of `model/` at the Tag | `schema_model_tree_sha` in the manifest |

Four nodes must share Tag, Image ID, and binary SHA256. A matching Git SHA with different Image IDs means per-node rebuild — treat as a release defect.

## VERSION

`VERSION` in Git may be empty on `main`. The **build worktree** writes the Release Tag into `VERSION` before `docker build` so:

- frontend `VITE_REACT_APP_VERSION`
- Go `common.Version` via ldflags

both equal the Tag. `/api/status` `version` must equal that Tag after deploy.

Also inject the full Git SHA (separate ldflags or status field). If the current binary only exposes `common.Version`, the Tag string must still uniquely identify the commit via the `prod-…-<short-sha>` suffix until a dedicated SHA field exists.

## Schema

There is no `migrations/` directory. Startup runs GORM `AutoMigrate` plus a few explicit `ALTER`s in `model/main.go`.

Consequences:

- Forward: starting a new Tag can add columns. That is a one-way production schema change.
- Reverse: loading an older image does **not** drop columns. An old binary may fail or mis-bill if it cannot tolerate the new schema.
- The release manifest records `schema_model_tree_sha` (`git rev-parse <tag>:model`) and `schema_notes`. Compare with the previous release. If `model/` changed, rollback of the app requires an explicit schema-compatibility statement from the Development Agent and user approval.
- Cloud database backups are not a commit↔schema map. Do not treat backup time as schema version.

Do not invent a second migration framework in a hotfix. Document compatibility in the manifest.

## Known Git vs live drift (until the first `prod-` rollout)

- `deploy/api-cvm/docker-compose.yml` still pins `fluxlane/api-control:eaae4af5` and healthchecks `/api/status`.
- HEAD on `main` (`3c52e436` at skill update) includes `/readyz`.
- New templates live in `deploy/api/`, `deploy/run/`, `deploy/common/` and are used only after a tagged one-shot build.

Verify live Compose and CLB independently of Git.
