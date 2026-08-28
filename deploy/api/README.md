# Fluxlane API node Compose (tagged releases)

Pin `FLUXLANE_IMAGE_TAG` to a `prod-YYYYMMDD-<short-sha>` that was built once on `43.160.247.94` and loaded on this node.

Peer API node must stay in CLB while this node is drained. Procedure: `docs/operations/RELEASE_WORKFLOW.md`.

Until the first tagged rollout, live CVM files are still under `deploy/api-cvm/`.
