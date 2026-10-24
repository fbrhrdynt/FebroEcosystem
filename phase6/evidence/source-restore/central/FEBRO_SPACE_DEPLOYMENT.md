# Febro Space deployment and rollback

Status: NOT ACTIVATED. Approval is required before any command in the activation/rollback sections. No PM2 or Nginx operation was performed. Frontend production files remain unchanged because the running server reads them on every request.

## Review and local verification

Editable implementation: /opt/febro-ecosystem/redesign. Dependencies are a symlink to the existing node_modules; no install is required. This source copy contains no .env or production data. Do not run its default start command: it defaults to port 3470 and would use a new local data directory. Use only the isolated checks below.

```bash
cd /opt/febro-ecosystem
npm run check --prefix redesign
npm test --prefix redesign
PLAYWRIGHT_MODULE=/tmp/febro-browser/node_modules/playwright/index.mjs node redesign/scripts/test-unified-browser.mjs
sha256sum -c redesign/BASELINE.sha256
```

Browser tests bind an ephemeral loopback port, use a disposable temporary database, intercept eco requests to that server, and remove temporary data afterward. Simulated client IPs avoid overwhelming a single client's unchanged rate limit. Test credentials are fixtures, never production credentials.

## Activation — only after explicit approval

Run as the existing service owner, in its existing PM2 environment. Inspect CHANGED_FILES.txt before copying. Any checksum failure means stop and reconcile intervening edits. No environment, database, upload, OAuth, permission, other application or Nginx change is needed. Stopping only this app prevents mixed old/new assets during copy; brief downtime is expected.

```bash
cd /opt/febro-ecosystem
sha256sum -c redesign/BASELINE.sha256
npm run check --prefix redesign
npm test --prefix redesign
release_stamp=$(date -u +%Y%m%dT%H%M%SZ)
rollback_archive="backups/febro-space-preactivation-$release_stamp.tar.gz"
tar -czf "$rollback_archive" --files-from redesign/BASELINE_FILES.txt
printf '%s\n' "$rollback_archive" > redesign/LAST_ROLLBACK_ARCHIVE.txt
pm2 stop febro-ecosystem
while IFS= read -r source_file; do
  install -D -m 644 "redesign/$source_file" "$source_file"
done < redesign/CHANGED_FILES.txt
pm2 restart febro-ecosystem
curl --fail --silent --show-error -H 'Host: eco.febro.id' http://127.0.0.1:3470/v1/health
```

Use a shell with `set -e` for activation so a failed copy prevents restart with incomplete files. If a step fails after stop, execute rollback below. Do not use --update-env, change .env, run setup.sh, reload Nginx, or restart all services. Existing backend needs restart solely to register new frontend assets and the template stylesheet/cache changes.

After activation, verify https://eco.febro.id/ and all module deep links; test a real existing account at /profile, logout, and verified admin access at /profile/console. Check light/dark and mobile drawer. OAuth and SMTP must use the existing credentials; no live credential tests were performed in this task. Check an incognito non-admin session cannot access Control Center. Legacy hosts remain supported. Existing unified Nginx activation from the prior migration is a separate approval/scope: this redesign makes no routing changes.

## Rollback — only if authorized

The preactivation archive restores only files replaced in this release. The separate source snapshot backups/febro-space-source-20261022T150524Z.tar.gz remains available as initial evidence. Never restore a database as part of frontend rollback.

```bash
cd /opt/febro-ecosystem
rollback_archive=$(cat redesign/LAST_ROLLBACK_ARCHIVE.txt)
test -f "$rollback_archive"
pm2 stop febro-ecosystem
tar -xzf "$rollback_archive" -C /opt/febro-ecosystem
while IFS= read -r new_file; do
  rm -- "$new_file"
done < redesign/NEW_FILES.txt
pm2 restart febro-ecosystem
curl --fail --silent --show-error -H 'Host: eco.febro.id' http://127.0.0.1:3470/v1/health
```

NEW_FILES.txt lists only newly introduced release assets/tests; review it first. No directories, data or uploads are deleted. Browser cache URLs are versioned; refresh clients after activation or rollback.
