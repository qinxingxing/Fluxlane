#!/bin/sh
set -eu

app_dir=/opt/fluxlane-api
env_file=/etc/fluxlane-api.env
compose_file=$app_dir/deploy/docker-compose.yml

test "$(stat -c '%U:%G:%a' "$env_file")" = "root:root:600"
grep -q '^SQL_DSN=.*@10\.20\.1\.11:5432/fluxlane_prod' "$env_file"
grep -q '^REDIS_CONN_STRING=.*@10\.20\.1\.13:6379/0' "$env_file"
timeout 5 bash -c '</dev/tcp/10.20.1.11/5432'
timeout 5 bash -c '</dev/tcp/10.20.1.13/6379'
docker image inspect fluxlane/api-control:eaae4af5 >/dev/null

mkdir -p "$app_dir/data" "$app_dir/logs"
docker compose -f "$compose_file" up -d --remove-orphans

i=0
while [ "$i" -lt 24 ]; do
  status=$(docker inspect --format '{{if .State.Health}}{{.State.Health.Status}}{{else}}none{{end}}' fluxlane-api 2>/dev/null || true)
  [ "$status" = healthy ] && exit 0
  [ "$status" = unhealthy ] && docker logs --tail 100 fluxlane-api >&2 && exit 1
  i=$((i + 1))
  sleep 5
done

docker logs --tail 100 fluxlane-api >&2
exit 1
