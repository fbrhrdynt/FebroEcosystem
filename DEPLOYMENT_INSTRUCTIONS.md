# Deployment instructions

## State and approval boundary
Source and proposed configuration are reviewable in this directory. No PM2 restart, Nginx install/reload, DNS write, certificate request or environment change has been performed. Obtain explicit user approval before the production steps below. Source files are on the production filesystem; PM2 watch is disabled, but shared public assets may be read by the running legacy process immediately. The frontend detects the unified HTML marker; legacy behavior is retained.

## Prerequisites
1. Confirm eco.febro.id A/AAAA records reach this ingress. A resolved to 161.248.116.14 during discovery; IPv6 and external reachability still require verification.
2. With privileged read access, inspect the active `nginx -T` output for eco.febro.id duplicates and verify a certificate SAN covering eco.febro.id, its expiry and readable private key. No eco name found in readable active *.conf files. Certificate storage is restricted to root; readiness unverified.
3. If no certificate exists, obtain it with an approved DNS challenge or temporary dedicated HTTP challenge virtual host. Do not run a broad certbot Nginx rewrite against unrelated hosts. The proposed TLS config must not be installed before its certificate is available. Keep all legacy hosts/certificates.
4. Keep DATA_DIR, APP_SECRET, SMTP settings and existing OIDC keys/client registrations unchanged. The existing Google redirect URI is supported. Optional direct eco callback requires Google-console allowlisting and GOOGLE_REDIRECT_URI=https://eco.febro.id/profile/auth/google/callback; switching is not required.
5. Preserve a consistent SQLite online backup (SQLite backup API, including WAL consistency) and private uploads before deployment if operational policy requires a fresh data recovery point. Do not restore an old database as a code rollback. Source snapshot excludes live data and secrets.

## Checks before activation
From /opt/febro-ecosystem:

```sh
npm run check
npm test
```

There is no build script; the application serves native JS/CSS/HTML directly. Optional browser suite needs Playwright and Chromium installed outside production dependencies:

```sh
PLAYWRIGHT_MODULE=/tmp/febro-browser/node_modules/playwright/index.mjs node scripts/test-unified-browser.mjs
```

The suite uses temporary storage and a random local port, never the production database. Its interception preserves the eco browser origin while reaching the isolated process. Browser package path can be replaced with another installed Playwright module.

## Approved activation
1. Review deploy/nginx-eco.febro.id.conf. Adjust certificate paths only if the validated certificate uses another directory.
2. Install ONLY that new file as /etc/nginx/conf.d/eco.febro.id.conf; do not overwrite febro-ecosystem.conf or any other virtual host. Keep an exact backup of any preexisting eco file.
3. Run privileged `nginx -t`. Stop on any error or conflicting-server-name warning; do not reload.
4. Restart ONLY `pm2 restart febro-ecosystem`. Confirm `curl -fsS -H 'Host: eco.febro.id' http://127.0.0.1:3470/health`, `/`, and module routes. PM2 watch is disabled; restart is required to activate routing.
5. Reload Nginx only after successful validation: `sudo systemctl reload nginx`.
6. Check HTTPS certificate, all target paths and deep-link refreshes from an external client. Check login, registration email, reset email, logout, Google consent/callback and identity linking with approved test accounts. Confirm existing API consumers and legacy URLs, PDF uploads/downloads, and mobile navigation.
7. Keep all legacy subdomains. Existing host-only sessions need login or handoff to establish an eco cookie; account records are shared and unchanged. Logout continues the existing global session revocation behavior.

## Rollback
Remove only the newly installed eco virtual host (or restore its prior version), validate Nginx and reload. Restore only changed source files from backups/unified-20261022T143753Z/source.tar.gz and restart ONLY febro-ecosystem. Preserve current .env, database, WAL, uploads and OIDC keys. Do not extract the entire archive over live data or restore all Nginx virtual hosts. Do not revert user data written since deployment.

## Validation limits
Current-user production nginx -t failed due to log and certificate permissions. An isolated candidate test passed using temporary self-signed certificates and unprivileged ports; this does not validate the actual production certificate or active configuration. Live OAuth credentials, external Google consent and SMTP delivery were not exercised.
