#!/usr/bin/env bash
set -euo pipefail
cd /opt/febro-ecosystem
node --check src/server.mjs
node --check public/app.js
node --test tests/site-shell.test.mjs
curl --fail --silent --show-error -H 'Host: tools.febro.id' http://127.0.0.1:3470/health
printf '\n'
for s in tools lab api docs qr convert snip short auth verify; do
  title="$(curl --fail --silent --show-error -H "Host: $s.febro.id" http://127.0.0.1:3470/ | grep -o '<title>[^<]*' | head -n1)"
  printf '%-9s %s\n' "$s" "$title"
done
