# Fluxlane API CVM deployment

This deployment runs only the Fluxlane API control plane on CVM `10.20.1.14`.
It does not change DNS and does not manage `run.fluxlane.ai`.

## Fixed dependencies

- PostgreSQL: `10.20.1.11:5432`, database `fluxlane_prod`
- Redis: `10.20.1.13:6379`, logical database `0`
- Secrets: `/etc/fluxlane-api.env` (`root:root`, mode `600`)
- Image: `fluxlane/api-control:eaae4af5`

## Deploy

Run `sudo /usr/local/sbin/deploy-fluxlane-api`. The script fails closed unless
both private data services are reachable and the environment file matches the
fixed targets.

## Rollback before DNS cutover

Run `sudo /usr/local/sbin/rollback-fluxlane-api`. The old API server remains
unchanged and is the traffic rollback target.

