#!/bin/bash
# Install the /readyz maintenance switch into this node's nginx site. Run as
# root on the node. Idempotent: skips patching if the switch is already
# present. Keeps at most KEEP_BACKUPS one-time backups (*.pre-maintenance.*);
# pre-existing backups are never deleted by this script — rotation only
# removes backups this script itself created.
#
# Usage: nginx-maintenance-install.sh [site-file]
#   API nodes: /etc/nginx/sites-available/fluxlane-api (default)
#   RUN nodes: /etc/nginx/sites-available/fluxlane-api-run
set -euo pipefail

SITE_FILE=${1:-/etc/nginx/sites-available/fluxlane-api}
KEEP_BACKUPS=5

[ -f "$SITE_FILE" ] || { echo "install: site file missing: $SITE_FILE" >&2; exit 1; }

if grep -q "fluxlane-maintenance" "$SITE_FILE"; then
  echo "install: maintenance switch already present in $SITE_FILE"
else
  BACKUP="$SITE_FILE.pre-maintenance.$(date -u +%Y%m%dT%H%M%SZ)"
  cp -a "$SITE_FILE" "$BACKUP"
  printf '%s\n' "$BACKUP" >> "$SITE_FILE.pre-maintenance.history"
  python3 - "$SITE_FILE" <<'PY'
import sys
p = sys.argv[1]
s = open(p).read()
needle = "    location = /readyz {\n"
guard = ("    location = /readyz {\n"
         "        if (-f /var/run/fluxlane-maintenance) {\n"
         "            return 503;\n"
         "        }\n")
if needle not in s:
    sys.exit("install: readyz location not found")
open(p, "w").write(s.replace(needle, guard, 1))
PY
  echo "install: patched (backup: $BACKUP)"

  # Rotate only backups recorded in our own history file.
  tac "$SITE_FILE.pre-maintenance.history" | tail -n +$((KEEP_BACKUPS + 1)) | while read -r old; do
    [ -f "$old" ] && rm -f -- "$old" && echo "install: rotated away old backup $old"
  done
  tac "$SITE_FILE.pre-maintenance.history" | head -n "$KEEP_BACKUPS" > "$SITE_FILE.pre-maintenance.history.tmp"
  mv "$SITE_FILE.pre-maintenance.history.tmp" "$SITE_FILE.pre-maintenance.history"
fi

nginx -t
systemctl reload nginx
sleep 1
code=$(curl -sk -o /dev/null -w '%{http_code}' -H 'Host: localhost' https://127.0.0.1/readyz)
[ "$code" = 200 ] || { echo "install: readyz=$code after reload, expected 200" >&2; exit 1; }
echo "install: OK (readyz=200, flag file absent)"
