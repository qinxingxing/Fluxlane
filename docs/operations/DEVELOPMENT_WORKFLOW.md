# Fluxlane development workflow

Canonical agent rules: `.agents/skills/fluxlane-production-operations/`. This file is the human-readable Git procedure.

## Goal

```text
需求 → 独立开发分支 → CI/本地检查 → 测试环境验证
→ 用户批准后合并 main → 生产 Tag → 开发机构建一次
→ 测试 Agent 验证制品 → 用户批准 → 四节点滚动 → 发布后验证 → 保留回滚制品
```

Test PASS is not a release. User approval is required to merge `main`, create a Tag, and roll production.

## Roles

| Role | Does | Does not |
|---|---|---|
| Development Agent | Code, branches, compile, unit tests, one-shot image, node rolls, observe, prepare rollback | Declare tests passed |
| Test Agent | Scope, functional/API/stream/Billing/capacity tests, evidence, PASS/FAIL | Change business code, prod config, balances, PostgreSQL/Redis, release, or fix prod |
| User | Scope, merge, Tag, go-live, known-risk acceptance, rollback | — |

## Branches

```text
main
├── codex/development     # Codex only, /home/codex/workspace/Fluxlane
├── zcode/development     # ZCode only, /home/codex/workspace/Fluxlane-zcode
└── feature/*             # Cursor, including cursor/<name>-<id>
```

- Do not develop on `main` or on production nodes.
- One task per commit when practical. No `git add .` of unexplained files. No force-push. No moving published Tags.
- Fetch `origin` and diff against `main` before merge.

## Development Agent start

```bash
git fetch origin
git status --short --branch
git log --oneline --decorate -10
git diff origin/main...HEAD
```

Confirm worktree, branch, understood dirty state, baseline from `origin/main`.

## Development Agent finish

1. Stage only this task.
2. Format, relevant unit tests, frontend build or Go compile.
3. `git diff --check`. Secret scan.
4. Commit and push the development branch.
5. Report files, reason, tests, risks, SHA, and what the Test Agent must verify.

## Test Agent on a development commit

Pin the SHA. Split functional / regression / Billing / performance / security. Do not mix load profiles. Output PASS or FAIL with evidence (no keys).

Only then recommend merge to `main`.

## Merge (user approved)

1. Fetch `origin/main`, diff, resolve on the development branch.
2. Re-run tests.
3. Merge and push `main`. Record SHA.
4. Pages (`www` / `console` / `doc`) build from `main`. Test Agent checks home, login/logout, Console, docs, logo/favicon, static assets, deep links, API origin, browser console, no new 404/405/Network Error.
5. Frontend failure blocks a production backend Tag.
