#!/usr/bin/env bash
set -euo pipefail

cd /var/www/fasadof/fasadof

git pull --ff-only
npm ci
npm run typecheck
npm run build
npm run migrate:vps

systemctl restart fasadof
if ! systemctl is-active --quiet fasadof; then
  echo "ERROR: fasadof.service did not become active after restart" >&2
  journalctl -u fasadof --no-pager -n 80 >&2
  exit 1
fi

for attempt in {1..10}; do
  if curl --fail --silent --show-error http://127.0.0.1:3000/health >/dev/null; then
    echo "fasadof.service is active and healthcheck passed"
    exit 0
  fi
  sleep 2
done

echo "ERROR: fasadof.service started, but /health did not become ready" >&2
journalctl -u fasadof --no-pager -n 80 >&2
exit 1
