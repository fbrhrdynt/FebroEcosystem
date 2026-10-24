# Migration inventory

Discovery: 2026-10-22. No Git metadata exists; current source is the baseline, including existing backup files and local changes.

## Architecture
Native Node HTTP server: src/server.mjs; ten hostname-selected modules with independent public/sites/*.html shells and shared public/app.js. No compilation/build step. Dependencies: Node >=22.13, node:sqlite, busboy, pdf-lib, pdfjs, qrcode, nodemailer, google-auth-library. Files conversion depends on installed external utilities; see src/files.mjs. docs-content/openapi.yaml describes external /v1/api consumers.

PM2 febro-ecosystem online, fork mode, watch disabled, src/server.mjs, production, port 3470. Other processes include files, itinerary-related services and VoltLab; outside this migration. Personal profile.febro.id is unrelated.

## Persistence
SQLite data/ecosystem.sqlite uses WAL; tables include users, hashed sessions/tokens, OAuth states, handoff tickets, links, snippets, API keys, documents and account control/OIDC tables. data/private contains source/output PDFs. data/oidc-private.pem and oidc-clients.json are sensitive. No schema/data migration needed. No production data writes are authorized for testing.

## Authentication and integrations
Email registration/verification, password login/reset, Google PKCE OAuth, profile editing, logout and global session revocation implemented. Host-only __Host-fb_session and OAuth state cookies: Secure in production, HttpOnly, Path=/, SameSite=Lax. Existing comment claiming domain cookies is stale. Sessions are hashed in SQLite. Legacy SSO uses single-use handoff tickets; OIDC issuer https://auth.febro.id must remain stable for independent consumers. Configured client details excluded. SMTP is an external dependency.

Origin checks protect browser writes; /v1/api/* intentionally permits wildcard CORS for API consumers, no credentialed CORS. CSP restricts scripts/connect to self. Unified routing must preserve these controls and avoid accepting legacy origins for eco browser mutations. Existing callback /auth/google/callback and issuer endpoints must continue on auth host. Existing host-only cookies cannot be automatically shared with eco.

## URLs and routing
Host routing, generated mail/short/snippet/document URLs: src/server.mjs. OAuth redirect validation: src/auth.mjs. Frontend URLs/deep links: public/app.js and public/sites/*.html. Curated external projects: src/docs.mjs. External account application list: src/control-plane.mjs. Preserve /v1/*, /oauth/* and /.well-known/* on legacy hosts. Unified API aliases will be module-prefixed, with existing /v1/* also available on eco.

## Infrastructure
Active Nginx includes /etc/nginx/conf.d/*.conf, not sites-enabled. Existing febro-ecosystem.conf proxies ten legacy hosts to 127.0.0.1:3470 with tools.febro.id certificate. No eco server_name found in active files. eco DNS resolves to 161.248.116.14; this alone does not prove correct ingress. Certificate readiness cannot be verified because certificate directories are permission restricted. nginx -t fails as current user due to log/certificate permissions. Privileged validation remains required. No Nginx mutation/reload or PM2 restart performed.

## Environment names (values deliberately omitted)
NODE_ENV, HOST, PORT, BASE_DOMAIN, ADMIN_EMAILS, SMTP_HOST, SMTP_PORT, SMTP_SECURE, SMTP_USER, SMTP_PASS, SMTP_FROM, GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, GOOGLE_REDIRECT_URI, ALLOW_REGISTRATION, ALLOW_SHORTENING, APP_SECRET, DATA_DIR
