# Febro Space production report

Status: NOT ACTIVATED — activation attempt failed; original production source restored and service healthy.

Recorded: 2026-10-22T15:21:45.801233+00:00

## Authorization and baseline

Explicit production approval was received. Read FEBRO_SPACE_DEPLOYMENT.md, FEBRO_SPACE_REPORT.md, CHANGED_FILES.txt, NEW_FILES.txt and BASELINE.sha256 before operations. All 22 existing-file checksums passed before modification, including a repeated check immediately before backup. Manifest coverage matched exactly: 22 existing files and 6 new files. All six new destinations were absent. Existing service owner ubuntu and PM2 working directory /opt/febro-ecosystem were verified.

## Backup and attempted activation

Timestamped backup: `backups/febro-space-preactivation-20261022T152041Z.tar.gz`. Created using BASELINE_FILES.txt before stopping the app; `tar -dzf` verified the archive against production. Pointer: redesign/LAST_ROLLBACK_ARCHIVE.txt.

A syntax error in the temporary activation wrapper concatenated the install command and loop terminator. The syntax check detected the error, but my command sequence incorrectly continued to execute the wrapper. Bash executed the baseline/backup and PM2 stop commands before encountering the malformed loop. This was an execution error, not a baseline conflict. No redesign file copy was executed. Brief downtime occurred.

Recovery immediately extracted the verified backup, restarted only febro-ecosystem, and rechecked all 22 baseline checksums successfully. All six new-file paths remain absent. No further activation attempted. PM2 febro-ecosystem is online with PID 65029. Every other PM2 application's PID, status and restart count matched its pre-attempt state.

## Tests and validation

Before activation:

- Staged npm run check: PASS.
- Staged npm test: 10/10 PASS, using isolated temporary databases.
- node --check for staged shell.js and control-center.js: PASS.
- Full documented Playwright suite: PASS; 15 routes at widths 375, 430, 768, 1024, 1440, refresh, theme persistence, isolated login/profile save/logout, pending/expired/failed sessions, administrator console, filtering, mobile drawer, search, JSON formatting and QR generation.
- Production /health on localhost and HTTPS: PASS.

After recovery:

- Baseline checksums: 22/22 PASS; release-new files absent: 6/6 PASS.
- Localhost with Host eco.febro.id and public HTTPS with normal certificate validation: /health, /v1/health, /, /profile and all existing module routes PASS.
- Guest Control Center /profile/console: expected 302 to /profile/account on both transports.
- Guest /profile/v1/control/users: expected 403 on both transports.
- No production authenticated user/admin session was available; real-account login/logout, authenticated Control Center and Google consent/token exchange were not tested against production. Their automated checks used isolated fixtures. No credentials or production accounts were created or changed.
- Production post-copy syntax/test checks were not reached because copying never began.

## Changed files and preserved scope

No redesign source changes remain in production. The 22 baseline files were re-extracted from backup and match their original checksums. The six planned new files were never installed. Operational artifacts created/updated: this report, timestamped backup above, redesign/LAST_ROLLBACK_ARCHIVE.txt, and evidence logs under backups. The documented browser suite refreshed its staged screenshots. Temporary wrapper/logs are under /tmp.

No databases, .env, secrets, OAuth configuration, roles, account records, uploads, API/auth logic, Nginx, SSL or DNS were replaced or edited. Only febro-ecosystem was stopped/restarted.

Approved release manifest (not activated):

- `public/app-icon-192.png`
- `public/app-icon-512.png`
- `public/app-icon.svg`
- `public/app.js`
- `public/apple-touch-icon.png`
- `public/console.html`
- `public/control-center.css`
- `public/control-center.js`
- `public/icon.svg`
- `public/index.html`
- `public/shell.js`
- `public/site-identities.css`
- `public/sites/api.html`
- `public/sites/auth.html`
- `public/sites/convert.html`
- `public/sites/dashboard.html`
- `public/sites/docs.html`
- `public/sites/lab.html`
- `public/sites/qr.html`
- `public/sites/short.html`
- `public/sites/snip.html`
- `public/sites/tools.html`
- `public/sites/verify.html`
- `public/unified.css`
- `scripts/test-unified-browser.mjs`
- `src/server.mjs`
- `tests/site-shell.test.mjs`
- `tests/space-access.test.mjs`

## Rollback instructions

Recovery is already complete; production matches the recorded baseline. For a future activated release, follow FEBRO_SPACE_DEPLOYMENT.md using the corresponding preactivation archive. The documented commands restore only release files and remove only NEW_FILES.txt entries; never restore a database.

```bash
set -e
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

Do not run that removal loop now: the new files are already absent. Revalidate baseline and both transports after any future rollback. Before another activation attempt, correct the temporary wrapper and ensure a failed syntax check prevents all execution.

## Recovery HTTP evidence

```text
http://127.0.0.1:3470/health: 200 PASS
http://127.0.0.1:3470/v1/health: 200 PASS
http://127.0.0.1:3470/: 200 PASS
http://127.0.0.1:3470/profile: 200 PASS
http://127.0.0.1:3470/profile/console: 302 PASS
http://127.0.0.1:3470/tools: 200 PASS
http://127.0.0.1:3470/lab: 200 PASS
http://127.0.0.1:3470/qr-generator: 200 PASS
http://127.0.0.1:3470/converter: 200 PASS
http://127.0.0.1:3470/url-shortener: 200 PASS
http://127.0.0.1:3470/snippets: 200 PASS
http://127.0.0.1:3470/verify: 200 PASS
http://127.0.0.1:3470/api: 200 PASS
http://127.0.0.1:3470/docs: 200 PASS
http://127.0.0.1:3470/docs/article/utility-api: 200 PASS
http://127.0.0.1:3470/profile/v1/control/users: 403 PASS
https://eco.febro.id/health: 200 PASS
https://eco.febro.id/v1/health: 200 PASS
https://eco.febro.id/: 200 PASS
https://eco.febro.id/profile: 200 PASS
https://eco.febro.id/profile/console: 302 PASS
https://eco.febro.id/tools: 200 PASS
https://eco.febro.id/lab: 200 PASS
https://eco.febro.id/qr-generator: 200 PASS
https://eco.febro.id/converter: 200 PASS
https://eco.febro.id/url-shortener: 200 PASS
https://eco.febro.id/snippets: 200 PASS
https://eco.febro.id/verify: 200 PASS
https://eco.febro.id/api: 200 PASS
https://eco.febro.id/docs: 200 PASS
https://eco.febro.id/docs/article/utility-api: 200 PASS
https://eco.febro.id/profile/v1/control/users: 403 PASS
```
