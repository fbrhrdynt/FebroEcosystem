# SSO discovery audit

Observed 2026-10-22 on the actual VPS. Read-only inspection; no service changes. Source is not a Git checkout at /opt/febro-ecosystem. Findings distinguish source/configuration from runtime certification.

## Inventory

/opt contains febro-ecosystem, lamariva, ls_itinerary, voltlab, febro-files, play; also unrelated projects LS_Inventory, amt, amt-dev, amt-releases, cabinex, dwm, febro, febro-landing, logishell, logisource, logisource-landing, receipt, server-health and backup/quarantine directories. Unrelated projects were not modified. Some protected backup directories cannot be listed by ubuntu.

Nginx includes /etc/nginx/conf.d/*.conf (no sites-enabled). Relevant files: eco.febro.id.conf, febro-ecosystem.conf, lamariva.conf, itinerary.febro.id.conf, voltlab.conf, febro-files.conf, play.febro.id.conf. Filename backups without .conf suffix are not included. eco HTTPS proxies 3470; its access log is disabled. Global main log includes request URI: callback logging needs per-vhost review before rollout.

Ubuntu PM2 reports febro-ecosystem, lamariva, voltlab, febro-files, febro-arcade-api and tribeworld-save online; lamariva-job-sync stopped. Itinerary runs as ubuntu node /opt/ls_itinerary/src/server.js but is absent from this PM2 list. Other PM2 daemons exist for root, deploy and logishell; their process inventories were not accessed. Listeners confirm ports in mapping. No PM2 mutation was issued.

## Central identity

src/server.mjs, auth.mjs, store.mjs, oidc.mjs and control-plane.mjs implement identity. eco.febro.id/profile routes to the auth module; existing issuer is hardcoded https://auth.febro.id, even when invoked through eco. Production SQLite data/ecosystem.sqlite. users.id UUID is stable; google_sub unique, email unique. Sessions are hashed server-side, seven days, host-only __Host-fb_session, HttpOnly, Secure, SameSite=Lax, Path=/. Google uses code + S256 and library ID token verification; collision requires existing-account login and explicit Google linking. Existing Google flow lacks nonce in source.

Existing endpoints: /v1/auth/me, /v1/auth/login, registration and recovery routes in server.mjs; /auth/google/start and callback. On eco auth paths gain /profile prefix. Existing OIDC discovery /.well-known/openid-configuration and /oauth/{authorize,token,jwks,userinfo} on auth host; eco exposes corresponding paths under /profile, but returns legacy issuer metadata. Registered-client configuration and private key exist under data; neither was printed or copied.

Existing provider validates exact HTTPS redirect, state, nonce, S256, client secret and one-use code, short signed tokens, active verified users and app access. It is a custom implementation, not a certified provider. No revocation or end-session endpoint. Migration will use oidc-provider in isolation rather than extend this protocol implementation.

## Application evidence

See SSO_APPLICATION_MAPPING.md. Files and Itinerary already rely on legacy issuer; switching issuer without explicit local links risks orphaning ownership. Itinerary POST /login currently redirects without password verification. VoltLab Google callback auto-links by email. Lamariva better-auth trusts Google account linking. These are migration blockers, not behaviors to copy.

Schema inspection first used source migration/Prisma definitions, then verified live metadata read-only. Evidence in sso-phase2/evidence/schema-metadata.json contains SQLite columns/FKs and PostgreSQL information_schema columns (Lamariva 157, Itinerary 89, VoltLab 29). Queries used SQLite readOnly and PostgreSQL default_transaction_read_only=on with statement timeout. No live user rows, credentials or individual user identifiers were exported. PostgreSQL constraint parity, aggregate ownership invariants and backup restoration still need verification before rollout.
