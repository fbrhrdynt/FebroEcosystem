# Implementation progress

2026-10-22. Production rollout has not started. Overall Phase 2 is NOT complete.

## Completed

- Read-only VPS discovery: actual app paths, ubuntu PM2 inventory, running listeners, Nginx includes/vhosts, source authentication/session/authorization and ownership mapping.
- Live database metadata only: SQLite table/column/foreign-key definitions and PostgreSQL information_schema column metadata. No user rows or secrets exported. Evidence: sso-phase2/evidence/schema-metadata.json.
- Discovery, mapping, architecture, risk, testing and deployment documents.
- Isolated pinned dependency package with maintained OIDC provider and RP library. Dedicated persistent-state adapter; no production imports or listener in factory.
- Code-only confidential clients; mandatory S256; discovery/JWKS/UserInfo/revocation/end-session metadata; exact redirects; stable supplied central IDs; short lifetimes; server-side provider state and secure cookie configuration.
- Isolated /profile mount and central session/consent interaction handler; CSRF, active-user/app checks, rate limiter and fixed-event audit hooks.
- Shared RP adapter with discovery, state/nonce/PKCE, signature validation, UserInfo subject binding and safe destination; one-use browser-bound server-side flow.
- Four application adapter cores preserve existing local IDs and local status/policy. Explicit dual-proof linking repository is tested against synthetic data.
- Additive Play identity/session repository preserves original player IDs and runs; isolated test exercises actual existing guest leaderboard API against a fresh temporary database.
- 12 isolated tests pass; existing Febro Space npm run check passes; isolated dependency audit has zero reported vulnerabilities at verification time.

## Open safety blockers before concrete application integration

1. VoltLab Google email-only linking and Lamariva trusted Google linking must be corrected in isolated app copies, including regressions for existing Google accounts.
2. Itinerary password login was already disabled in current source. Restore and test it without changing hashes before migration.
3. Files uses legacy subject as ownership primary key and truncates path issuers. Native identity mapping must preserve accounts.sub; prove legacy and new identity ownership explicitly.
4. Complete central login-to-interaction continuation and actual fresh reauthentication. Current isolated consent/login fixture must not ship as production UI.
5. Implement actual native session-store adapters/routes and linking confirmation UIs for Lamariva, Itinerary, VoltLab and Files; Play optional login/callback/guest-claim UI and score session selection.
6. Build safe empty PostgreSQL test databases and full isolated app environments with test-only credentials/SMTP/Google OAuth project. Existing production credentials must not be reused in tests.
7. Complete real Google/email/local login, browser cookie, HTTPS, admin/data-ownership, logout, expiry, access-revocation and application-endpoint tests. Contract tests do not replace these.
8. Complete PostgreSQL migrations with typed FKs, backup restore rehearsal, branded interaction integration, trusted proxy limits and audit persistence.

Application wiring and migrations stop at these unresolved account-safety risks. No app is ready for deployment approval. Continue in isolation; do not request rollout approval until a concrete app candidate passes its checklist.

## Changes and operating constraints

New content only: SSO_*.md and sso-phase2/. No existing src/, public/, application source, .env, key material, client registry, Nginx, DNS, SSL or PM2 configuration was changed. No production migration or restart/reload occurred. No Docker used. Test processes bind loopback ephemeral ports and are shut down by test cleanup. Existing real data was not used for automated tests.
