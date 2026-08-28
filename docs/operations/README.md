# Operations index

| Document | Use |
|---|---|
| [DEVELOPMENT_WORKFLOW.md](DEVELOPMENT_WORKFLOW.md) | Branches, commits, merge, Pages gate |
| [TESTING_WORKFLOW.md](TESTING_WORKFLOW.md) | Test Agent gates and Billing notes |
| [RELEASE_WORKFLOW.md](RELEASE_WORKFLOW.md) | Tag, one build, four-node roll |
| [ROLLBACK_WORKFLOW.md](ROLLBACK_WORKFLOW.md) | Previous image, schema gate |
| [DEVELOPMENT_SERVER.md](DEVELOPMENT_SERVER.md) | `43.160.247.94` layout and windows |
| [RELEASE_MANIFEST.example.json](RELEASE_MANIFEST.example.json) | Artifact identity file |

Agent skill: `.agents/skills/fluxlane-production-operations/`. Release scripts: `scripts/release/`. Deploy assets: `deploy/api/`, `deploy/run/`, `deploy/common/`. Historical CVM files: `deploy/api-cvm/`.

Install the skill on the development host from **merged `main`** only. An unmerged branch or draft PR is a proposal, not an operating rule.
