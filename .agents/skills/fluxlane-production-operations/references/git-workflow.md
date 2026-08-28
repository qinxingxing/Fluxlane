# Git branches, Tags, and handoff

## Model

```text
main
├── codex/development
├── zcode/development
└── feature/*          # includes Cursor cloud branches cursor/<name>-<id>
```

- `main` receives only code that completed Test Agent review and user merge approval.
- Codex works only on `codex/development` in `/home/codex/workspace/Fluxlane`.
- ZCode works only on `zcode/development` in `/home/codex/workspace/Fluxlane-zcode`.
- Cursor uses a dedicated `feature/*` or `cursor/*` branch in the shared Fluxlane worktree; do not commit on `main`.
- One task, one commit when practical. Do not `git add .` of unexplained files.
- No force-push. No rewriting published Tags. No developing on production nodes.

## Before a development task

```bash
git fetch origin
git status --short --branch
git log --oneline --decorate -10
git diff origin/main...HEAD
```

Confirm the correct worktree, branch, a clean or understood tree, and a baseline from latest `origin/main`.

## After development

1. Stage only this task's files.
2. Format, relevant unit tests, frontend build or `go` compile as applicable.
3. `git diff --check`. Scan the diff for secrets.
4. Single-purpose commit. Push the development branch.
5. Hand the Test Agent: files changed, why, test results, risks, commit SHA, features to verify.

Only the Test Agent may recommend merge to `main`. Only the user authorizes the merge.

## Merge to main (Development Agent, after user approval)

1. `git fetch origin`
2. Diff the development branch against `origin/main`
3. Resolve conflicts on the development branch
4. Re-run the relevant tests
5. Merge to `main` and push
6. Record the resulting `main` SHA

Cloudflare Pages listens to `main` for `www.fluxlane.ai`, `console.fluxlane.ai`, and `doc.fluxlane.ai`. Frontend Pages failure blocks creating a production backend Tag.

## Production Tag

After Test Agent PASS on `main` and user approval of the Tag:

```text
prod-YYYYMMDD-<short-sha>
```

Example: `prod-20260828-3c52e436`

The Tag must be annotated, unique, and point at a commit that is an ancestor of `origin/main`. Do not move it.

```bash
git show <tag>
git rev-parse <tag>^{}
git merge-base --is-ancestor <tag> origin/main
git push origin <tag>
```

Tag message includes the main change and the Test Agent conclusion. See [versioning.md](versioning.md).
