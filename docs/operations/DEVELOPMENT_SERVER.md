# Development server (`43.160.247.94`, user `codex`)

Windows is only the SSH launch point. This host holds Git worktrees, one-shot builds, release tarballs, QA Mock, and redacted test output. It is not an API or RUN node.

## Directories

| Path | Purpose |
|---|---|
| `/home/codex/workspace/Fluxlane` | Cursor + Codex Git |
| `/home/codex/workspace/Fluxlane-zcode` | ZCode Git only |
| `/home/codex/build/<release-tag>` | Clean Tag worktree, discarded after a successful save |
| `/home/codex/releases/<release-tag>/` | `.tar.zst`, `.sha256`, manifests, reports |
| `/home/codex/test-results/` | Redacted JSONL/summaries (no keys) |
| `/opt/qa-mock-provider` | Mock on `:18080` |
| `/home/codex/.codex/skills/` | Copy of Git `.agents/skills/` |
| `/home/codex/.ssh/id_ed25519` | GitHub SSH, mode `600`, `IdentitiesOnly=yes`; never print |

Install the ops skill from Git after pull:

```text
.agents/skills/fluxlane-production-operations/
  → /home/codex/.codex/skills/fluxlane-production-operations/
  → /home/codex/.cursor/skills/fluxlane-production-operations/
```

## Retention

- Build logs: 30 days
- Ordinary test logs: 30 days
- Production release records and current+previous artifacts: keep
- Delete older tarballs only if they are not in the rollback set and the user approved

## Windows (exclusive)

Development/build, QA functional, performance, Billing special, production publish.

Do not build while Mock is under load. Do not edit Mock usage during Billing tests. Do not prune images during tests.

## Resource checks

```bash
uptime
free -h
df -h
docker system df
docker stats --no-stream
```

Stop if disk free < 20%, memory is exhausted, swap grows, Mock latency is wrong, or containers restart/OOM.

Never `docker system prune -a` or `docker volume prune` without named targets and user approval.

## Must keep

Current and previous production images and tarballs, QA Mock image, rollback Compose/overrides.

## Must not

Write production PostgreSQL; mutate production Redis; store real Provider/payment secrets or full customer dumps; serve as public API/RUN; run long-lived public admin UIs.
