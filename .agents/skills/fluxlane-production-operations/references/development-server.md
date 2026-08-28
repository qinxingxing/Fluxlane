# Development server (`43.160.247.94`, user `codex`)

## Directories (do not mix)

```text
/home/codex/workspace/Fluxlane          Git (Cursor + Codex)
/home/codex/workspace/Fluxlane-zcode    Git (ZCode only)
/home/codex/build/<release-tag>         Clean build worktree
/home/codex/releases/<release-tag>/     Artifacts, manifests, reports
/home/codex/test-results/               Redacted client evidence
/opt/qa-mock-provider                   Mock provider, port 18080
/home/codex/.codex/skills/              Shared skills (copy from merged main only)
/home/codex/.ssh/id_ed25519             GitHub SSH (mode 600; never print)
```

## One-shot build

Only this host may build production images. Production API/RUN nodes never `docker build`.

```bash
scripts/release/build-release.sh prod-YYYYMMDD-<short-sha>
scripts/release/verify-artifact.sh prod-YYYYMMDD-<short-sha>
```

The script creates and removes the clean Tag worktree, writes `VERSION`, injects `GIT_COMMIT`, builds once, asserts the binary reports tag and commit, exports `.tar.zst` + `.sha256`, and writes `release-manifest.json`. It refuses to rebuild an existing artifact.

Keep `test-report.md`, `deployment-record.md`, and `rollback-record.md` beside the tarball. Requires `docker`, `zstd`, `sha256sum`, `jq`.

If anything is rebuilt after the Test Agent starts, previous PASS is void.

## Time windows (mutually exclusive)

```text
development/build
QA functional
performance / k6
Billing special
production publish
```

Forbidden overlaps: Docker build vs Mock load test; Billing tests vs Mock usage edits; publish build vs heavy load; deleting images during a test.

## Resource stop conditions

Check `uptime`, `free -h`, `df -h`, `docker system df`, `docker stats --no-stream` before and after build or load.

Stop if disk free < 20%, memory is exhausted, swap grows continuously, Mock latency is abnormal, containers restart or OOM, or a build contaminates a test.

Never `docker system prune -a` or `docker volume prune` without naming each target and user approval. Keep current and previous production images, current and previous release tarballs, the QA Mock image, and rollback Compose.

## QA Mock

`/opt/qa-mock-provider` on port 18080. No real Provider keys. Do not treat Mock PASS as production Provider PASS.

## Security

The development host must not write production PostgreSQL, mutate production Redis, store real Provider or payment secrets, store full customer dumps, act as an API/RUN node, or expose long-lived public admin services. Production access is only for authorized deploy and read-only observation.
