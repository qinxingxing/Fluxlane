# Maintenance-flag rolling rollout

Zero-502 rolling deploys for the four production nodes, based on a per-node
Nginx maintenance switch. No Tencent CLB API credentials are needed: the CLB's
own health check performs the soft detach and the automatic rejoin.

## Mechanism

- `nginx` returns **503 for `/readyz` only** when `/var/run/fluxlane-maintenance`
  exists. All business paths keep proxying; in-flight requests are never cut.
- The CLB health check fails → the backend is marked unhealthy (soft detach,
  no CLB config change) → traffic moves to the peer.
- After deploy and local probe gates, the flag is removed; the CLB health
  check recovers → automatic rejoin.
- During the CLB failover window (~10–30s) public `/readyz` may answer 503 a
  few times. Business API paths are unaffected. **Monitoring must classify
  `/readyz` 503 from a node under maintenance as planned maintenance**, not an
  incident (e.g. silence `/readyz` alerts for the node during the rollout
  window).

## Components

| File | Where | Purpose |
|---|---|---|
| `deploy/common/nginx-maintenance-install.sh` | node (root) | Idempotent install of the `/readyz` switch into the site file. Backs up once; keeps at most 5 of its own backups (`*.pre-maintenance.*` + `.history`); never deletes pre-existing backups. |
| `deploy/common/rolling.sh` | node (root) | One-node roll: peer gate, active detach proof, drain, deploy, probe gates, observation window, rejoin stability. |
| `scripts/release/rollout.sh` | dev host | Central entry: cluster-wide `flock`, per-node asset sha256 verification against the Git commit, sequential orchestration. |

## Rollout procedure (from the development host)

```bash
# 0. Assets must be merged to main and the tree clean; rollout refuses local edits.
git -C "$FLUXLANE_REPO_DIR" status --porcelain -- deploy/   # must be empty

# 1. First run after merging new deploy assets (sync + verify sha256):
scripts/release/rollout.sh --sync-assets <tag> api-1
# 2. Then each remaining node, one at a time, in order:
scripts/release/rollout.sh <tag> api-2
scripts/release/rollout.sh <tag> run-1
scripts/release/rollout.sh <tag> run-2
# Or all four in one locked run:
scripts/release/rollout.sh --sync-assets <tag> api-1 api-2 run-1 run-2
```

Order is always API-1 → API-2 → RUN-1 → RUN-2; never two nodes of the same
service together (the central lock plus per-node lease files enforce this).

## Safety properties

- **Detach proof is active, not passive**: each round sends 30 unique
  read-only probes through the public entry (api: `/api/status` 200; run:
  `/v1/models` unauthenticated 401 — no Provider/Usage/Billing side effects)
  and requires **zero hits** in the target node's access log; the round is
  repeated after a full health-threshold window. Natural-traffic log quiet is
  a required additional gate, never the only evidence.
- **Peer gate**: public entry must serve 200 (served by the peer) before the
  node is drained.
- **Failure keeps the node offline**: any failure after deploy begins leaves
  the maintenance flag in place; a broken version never rejoins on its own.
  Roll back with `deploy/<role>/rollback.sh`, then remove the flag manually.
- **Signals**: INT/TERM before deploy restore service (flag removed); after
  deploy starts they keep the node offline.
- **Post-deploy observation**: 60s window; probes must hold 200, container
  restart count 0, no OOM.
- **Rejoin stability**: traffic must return within 240s and probes still 200
  60s after traffic resumed.

## Install / upgrade / restore on a node

```bash
# install or upgrade the nginx switch (idempotent)
sudo /opt/fluxlane/deploy/common/nginx-maintenance-install.sh \
     /etc/nginx/sites-available/fluxlane-api      # api nodes
sudo /opt/fluxlane/deploy/common/nginx-maintenance-install.sh \
     /etc/nginx/sites-available/fluxlane-api-run  # run nodes

# manual maintenance control
sudo touch /var/run/fluxlane-maintenance   # soft detach (readyz 503)
sudo rm -f  /var/run/fluxlane-maintenance  # rejoin

# restore the original site config ( emergencies only )
sudo cp -a /etc/nginx/sites-available/<site>.pre-maintenance.<timestamp> \
           /etc/nginx/sites-available/<site> && sudo nginx -t && sudo systemctl reload nginx
```

The maintenance flag lives in `/var/run` (tmpfs): it never survives a reboot,
so a node always boots into the rejoined state.
