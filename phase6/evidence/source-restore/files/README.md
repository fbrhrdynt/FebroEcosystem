# Febro Files v1.0 — Cloud Storage + SSO Bridge

**Febro Files — by Febro Herdyanto**

Independent service `files.febro.id` on `127.0.0.1:3480`, using a registered OpenID Connect client at `auth.febro.id`. Independent sidebar and appearance; **not** part of the ten-app navbar.

## Features delivered

- 100 MB default quota for registered users (100 × 1024 × 1024 bytes), admin-modifiable default + user overrides, used space stats
- Streamed file uploads without loading large files into Node.js memory; limit by account quota, server upload ceiling, free disk space and concurrent requests
- File/folder hierarchy, rename, move, search, download, drag/drop upload, trash, restore, permanent purge
- Public read-only shares with one-time-secret share URL, expiry, optional password (scrypt), download limit and revoke
- Read-only sharing to email addresses; existing and future signed-in accounts can access via verified email
- File storage outside web root, disk keys random UUIDs, no user-controlled filesystem paths, attachment-only download response
- Admin console with user quota, default quota, blocked users, aggregate storage, audit activity. Admin cannot read other users' private files via the UI/API.
- SSO: existing Febro Account email or Google login. OAuth Authorization Code + PKCE + RS256 ID token + one-time authorization code. Service uses its own host-only HttpOnly session cookie.
- Dark/light theme, responsive UI, brand text **by Febro Herdyanto**.

## Installation on Ubuntu VPS (non-Docker)

### 0 — Prerequisites

Existing `/opt/febro-ecosystem` from v2.1, Node 22.13+ and PM2 on VPS. `auth.febro.id` already online with HTTPS and email/Google account flows configured. Add DNS A record `files.febro.id` pointing to the same VPS public IP.

Check available disk space (`df -h /opt`). **Quota is a per-user logical limit, not a promise of physical disk availability.** For 100 users at 100 MB, budget at least 10 GB for stored files plus filesystem backups, temp uploads and OS overhead. Do not expose public registration until disk space and backup plans are adequate.

### 1 — Upload via WinSCP, unzip

Upload ZIP to `/home/ubuntu/Febro_Files_v1.0.0_With_SSO_Patch.zip`. Then:

```bash
sudo mkdir -p /opt/febro-files
sudo chown -R ubuntu:ubuntu /opt/febro-files
unzip -o /home/ubuntu/Febro_Files_v1.0.0_With_SSO_Patch.zip -d /opt/febro-files
cd /opt/febro-files
npm run check
npm test
```

No `npm install` is necessary for Febro Files — it uses built-in Node.js 22 modules. The existing Febro Ecosystem dependencies remain unchanged.

### 2 — Safe OIDC patch; generate secrets

```bash
cd /opt/febro-files
node scripts/patch-auth.mjs
node scripts/install-config.mjs
chmod 600 .env
chmod 700 data || true
```

This **patches** (not replaces) `/opt/febro-ecosystem/src/server.mjs` and backs up the original. It adds `/opt/febro-ecosystem/src/oidc.mjs`, creates `/opt/febro-ecosystem/data/oidc-clients.json` (registered client secret), and writes `/opt/febro-files/.env` with the same secret and a session secret. Neither secret is printed to SSH or exposed in the browser. Existing `.env`, user database, Google OAuth and SMTP credentials are preserved.

> Do not put private keys, JSON clients, `.env`, or `data` folders in GitHub.

### 3 — Restart both services

```bash
pm2 restart febro-ecosystem --update-env
cd /opt/febro-files
pm2 start ecosystem.config.cjs
pm2 save
pm2 status
curl -i -H 'Host: auth.febro.id' http://127.0.0.1:3470/.well-known/openid-configuration
curl -i http://127.0.0.1:3480/health
```

Expect JSON discovery from auth and HTTP 200 health from Files. Check `pm2 logs febro-files --lines 30` if problems arise.

### 4 — Nginx and HTTPS (new vhost only)

```bash
sudo cp /opt/febro-files/deploy/nginx-files.febro.id.conf /etc/nginx/conf.d/febro-files.conf
sudo nginx -t
sudo systemctl reload nginx
sudo certbot --nginx -d files.febro.id --redirect
sudo certbot renew --dry-run
```

Check no other Nginx config already defines `files.febro.id`. The previous certificate for 10 subdomains does **not** need replacing. Certbot creates a certificate for the new domain.

### 5 — Test authentication & key functions

1. Open `https://files.febro.id/` and click *Masuk dengan Febro Account*.
2. Use your existing `auth.febro.id` email/password or Google login. Verify redirection back to Files, no extra account registration.
3. Check My Files quota 100 MB. Upload 1 MB PDF, create folder, move/rename, download.
4. Share a folder with a password and open link in incognito mode; verify password required and expiration.
5. Share a file to another registered email, sign in with that user; verify their access is read-only and cannot view other folders.
6. Log in as `febroherdyanto@outlook.com` (email verified at auth) and open Admin Console; change default and user quota. Try admin URL with ordinary user and expect HTTP 403.
7. Verify access denial when trying to download another user's file ID, and verify that `https://files.febro.id` uses HTTPS.

### 6 — Backups & operations

```bash
# For a consistent backup, stop Files, copy the full data directory, then restart.
pm2 stop febro-files
sudo tar -C /opt/febro-files -czf /home/ubuntu/febro-files-data-$(date +%Y%m%d).tar.gz data
pm2 start febro-files

# Back up the OIDC keys and client registry together with the existing ecosystem DB.
# Keep backup tar files off-server and encrypted. Do not publish .env/secrets.
```

If backup tar is created root-owned, use `sudo chown ubuntu:ubuntu` on the tar to retrieve via WinSCP safely; don't change permissions on private data in-place.

### Rollback the auth patch

The patcher prints the full backup path (`server.mjs.before-files-oidc.YYYYMMDD...bak`). In case auth stops after patch:

```bash
pm2 stop febro-files
cp /opt/febro-ecosystem/src/server.mjs.before-files-oidc.<TIMESTAMP>.bak /opt/febro-ecosystem/src/server.mjs
pm2 restart febro-ecosystem --update-env
```

Leave the files and data in place during rollback; don't delete SQLite, `.env` or uploaded files.

## Operational limitations before public launch

- No at-rest encryption, end-to-end encryption, virus scan or document malware filtering included. Treat all uploaded documents as untrusted and serve only as attachments. Consider malware scanning and dedicated disk/object storage before allowing unrestricted public signups.
- No upload resume/chunking, thumbnails, online document editor, file version history, WebDAV or sync desktop client. This is a usable cloud file manager baseline, **not feature parity with ownCloud or Nextcloud**.
- Share links are security-sensitive bearer URLs. Public folder shares include descendants. Choose passwords/expiry for sensitive content.
- File system storage is local VPS disk, so restoring only SQLite without files will lose contents. Back up database and vault together.
- Session sign-out is per app, not global cross-app logout. Account linking for VoltLab/Itinerary is a later code migration, described in `SSO_INTEGRATION.md`.
- This package includes targeted unit and HTTP tests, but Google/email login and public DNS-to-DNS HTTPS redirect cannot be fully verified without deployment to your VPS.
