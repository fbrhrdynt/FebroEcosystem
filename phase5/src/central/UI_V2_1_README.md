# Febro Ecosystem — Independent UI v2.1.0

**Type:** non-destructive UI patch for Febro Ecosystem v2.0.1 PM2 Hotfix.

**Goal:** 10 independently branded subdomain frontends, no global ecosystem navbar, one shared Node.js backend / API / auth database.

## Design per site

| Domain | Distinct identity | Main navigation |
|---|---|---|
| tools.febro.id | Toolroom — blue utility workbench / graph-paper grid | Toolbox, Workspace, Hasil |
| qr.febro.id | QR Studio — white-lavender creative generator | Buat QR, Preview |
| convert.febro.id | Fileworks — warm document studio / print-shop layout | Konversi, Upload |
| short.febro.id | Linkcraft — dark, chartreuse-accent link desk | Buat link, Link saya |
| snip.febro.id | Snipbase — terminal-inspired code editor | Editor, Library |
| lab.febro.id | Febro Labs — editorial project archive | Projects, Portfolio |
| api.febro.id | Febro API — dark developer interface | Endpoints, API keys, Docs |
| docs.febro.id | Fieldnotes — serif technical documentation, sidebar index | Baca, Daftar artikel, OpenAPI |
| auth.febro.id | Febro Account — focused sign-in and profile UX | Masuk, Daftar, Akun |
| verify.febro.id | Verify Registry — institutional document-verification layout | Portal, Dokumen |

Each site has a unique document title, meta description, local-only product menu (with one contextual link to Docs or Portfolio where useful), and product attribution `by Febro Herdyanto` in header and footer.

## Exactly what changes

- `src/server.mjs`: serve a standalone `public/sites/<domain>.html` for each host and allow new `site-identities.css` static asset.
- `public/sites/`: 10 independent HTML shells, page-specific meta description, brand, scoped nav.
- `public/site-identities.css`: site-specific layouts, colors, mobile breakpoints, dark themes, accessibility and reduced-motion.
- `public/app.js`: minor local development behavior fix; tool/auth/API functionality unchanged.
- `tests/site-shell.test.mjs`: isolated UI-regression tests.

**Not replaced or changed:** `.env`, `/data/`, `ecosystem.config.cjs`, Nginx, SSL, `src/auth.mjs`, `src/store.mjs`, `src/files.mjs`, `src/security.mjs`, or other services in PM2.

## Deploy via WinSCP and SSH

1. Upload `Febro_Ecosystem_v2.1.0-Independent-UI.zip` to `/home/ubuntu/` via WinSCP.
2. SSH and back up current UI **before** extraction:

```bash
cd /opt/febro-ecosystem || exit 1
mkdir -p /home/ubuntu/febro-ui-backups
tar -czf "/home/ubuntu/febro-ui-backups/ui-before-v2.1-$(date +%Y%m%d-%H%M%S).tar.gz" \
  src/server.mjs public/app.js public/app.css public/index.html
```

3. Extract patch over the installed app (paths in zip are relative to `/opt/febro-ecosystem`):

```bash
unzip -o /home/ubuntu/Febro_Ecosystem_v2.1.0-Independent-UI.zip -d /opt/febro-ecosystem
cd /opt/febro-ecosystem
node --check src/server.mjs
node --check public/app.js
node --test tests/site-shell.test.mjs
pm2 restart febro-ecosystem --update-env
pm2 save
```

4. Verify app and 10 unique titles:

```bash
curl -fsS -H 'Host: tools.febro.id' http://127.0.0.1:3470/health
for sub in tools lab api docs qr convert snip short auth verify; do
  printf '\n%s: ' "$sub"
  curl -fsS -H "Host: $sub.febro.id" http://127.0.0.1:3470/ \
    | grep -o '<title>[^<]*' | head -n1
done
```

If all works, refresh the public sites. Assets include `?v=2.1.0` to avoid using cached styles and scripts. DNS/Certbot/Nginx remain untouched.

**Do not** run database reset, `npm ci`, `pm2 delete`, or recreate `.env` for this UI patch. No new NPM packages are needed.

## Rollback

Select the backup file created above and restore only the previously backed up UI files, then restart:

```bash
cd /opt/febro-ecosystem
ls -lt /home/ubuntu/febro-ui-backups/
# Replace BACKUP_FILENAME with the exact tar.gz backup created earlier.
tar -xzf /home/ubuntu/febro-ui-backups/BACKUP_FILENAME -C /opt/febro-ecosystem
pm2 restart febro-ecosystem --update-env
```

Extra v2.1 CSS/templates may remain on disk but won't be used after restoring `src/server.mjs`.

## Scope of checks

Static site checks and Chromium DOM render checks for all 10 apps, on desktop and 390px mobile, passed locally. Existing SQLite store tests passed locally. Production Google OAuth, email SMTP and PDF stamping have **not** been retested by this UI patch and require checks on the VPS. Screenshots bundled separately are local previews with simulated data, **not** live production screenshots.

## Security and SEO

The patch keeps existing auth, host-only cookies, CSRF Origin checks, PDF upload security controls, rate limiting and `Content-Security-Policy` logic unchanged. Independent page titles and descriptions are set; discoverability and indexing still depend on real content, robots directives and search engine crawling. `verify.febro.id` remains a registry-based verification service rather than certified electronic signature.
