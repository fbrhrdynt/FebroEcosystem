# Febro Space audit

Vanilla JS ESM frontend, Node HTTP server, SQLite-backed existing account system. No bundler. Production serves public files from disk; implementation is isolated in redesign/ to prevent automatic activation. No Git repository exists; all prior source remains untouched. Timestamped source-only backup is under backups/febro-space-source-*.tar.gz; excludes environment, databases, uploads, dependencies and caches. Existing migration backups also retained.

Routes: /, /tools, /lab, /qr-generator, /converter, /url-shortener, /snippets, /verify, /api, /docs, /profile. Deep links include /profile/account, register, forgot, reset, console; snippets/s/:id, docs/article/:slug, verify/v/:id. Legacy host routing must remain supported.

Profile bug: renderAuth only chooses account UI for /account, despite init already loading /v1/auth/me. Reuse that renderer at authenticated root. Profile update, verification resend, password reset, Google linking and logout already exist. No user-facing session listing or connected-app management endpoint is implemented; do not invent these.

Control Center: server-gated /profile/console, fixed central-admin policy, paginated users, block/unblock, access toggles, session revocation and audit. Administrator roles are protected by existing code; no administrator editing endpoint exists. Static summary values and yellow styling need removal. Preserve all API restrictions.

Modules share app.css/app.js; independent templates load heavy site-identities overrides. Unified server injects a horizontal module nav. Replace presentation with a shared shell, preserve all module workflows. Browser automation available in /tmp/febro-browser/node_modules/playwright.
