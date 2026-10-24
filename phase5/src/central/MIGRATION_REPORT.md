# Unified domain migration report

Date: 2026-10-22. Implementation and local verification complete. Production activation is pending explicit user approval and infrastructure verification. This is not a claim that eco.febro.id is live on the new application.

## Implemented
- All ten target module paths plus a central dashboard. Existing hostname routing remains intact.
- Request-scoped routing context prevents URL generation from leaking between simultaneous legacy and unified requests. Existing /v1 endpoints are retained; module-prefixed API aliases provide unambiguous same-origin requests. API misses return JSON errors.
- Unified navigation, light-blue flat styling, responsive grids, persistent light/dark theme; independent legacy shells preserved. Unified assets use a new JS cache version.
- Account login, registration UI/validation, account editing/settings, reset/verification token routes and logout are available below /profile. Secure host-only session cookies retain Path=/, HttpOnly, SameSite=Lax. Unified mutation origin checks require the eco origin. Logout retains global session revocation.
- Google initiation supports the existing legacy callback and one-use handoff back to eco, including identity bridging before Google linking. An optional eco callback is accepted only with matching environment/Google configuration. Legacy OIDC issuer remains unchanged for external integrations.
- Generated short/snippet/document URLs use unified prefixes on eco requests; existing records and old document QR URLs remain usable on legacy hosts. Curated module URLs and OpenAPI include the unified architecture.

See ROUTE_MAPPING.md for each module's old/new URL, source, status, test result and remaining issue.

## Verification evidence
- `npm run check`: PASS.
- `npm test`: PASS, 9/9 tests. Added production-mode isolated HTTP integration coverage for all target pages, legacy pages, deep links, assets, JSON 404 behavior, API/CORS, Secure __Host cookies, login/profile/logout, CSRF rejection, short redirects, public snippets, multipart PDF upload/stamping/download, text-to-PDF conversion, SQLite reads through a second connection, Google legacy initiation/link handoff, invalid OAuth state rejection, single-use handoff/reset tokens, email verification redirects and unchanged OIDC discovery.
- Chromium: PASS for 15 pages at 390px and 1280px widths, refreshes, horizontal overflow, theme persistence, login, profile save/reload and logout; no JavaScript errors or failed HTTP responses in the final run. Reproducible script: scripts/test-unified-browser.mjs. Test intercepts requests to an isolated ephemeral backend and turns intercepted HTTP redirects into fresh browser navigations so redirects stay inside the test harness. HTTP status/redirect semantics are tested separately by the HTTP suite.
- Live existing process: all ten legacy Host headers return 200 from /health on 127.0.0.1:3470. PM2 remains online, PID 52646, restart count 0, watch false. Public TLS/legacy browser behavior after activation remains an acceptance check.
- Proposed Nginx configuration: isolated `nginx -t` PASS with temporary certificate and high ports. Active production `nginx -t` BLOCKED by log/certificate permissions. Actual certificate and ingress are not validated.
- Production build: not applicable; package.json has no build command. Native Node/HTML/CSS assets are served directly.

## Preservation and backup
No Git repository exists, so a Git diff baseline was unavailable. Existing files were preserved in backups/unified-20261022T143753Z/source.tar.gz before edits. Readable Nginx configuration snapshot is private in that directory. node_modules, caches, .env, live databases, uploads and OIDC secrets were excluded from source backup and reports. Production data, .env and OIDC keys were not modified. Tests used temporary databases/files and removed only their own temporary data. No unrelated service, Nginx host or legacy subdomain was changed.

The PM2 process was not restarted and Nginx was not changed/reloaded. Because edits are in the live source directory, shared assets can be read immediately by the running legacy server; the updated frontend uses an explicit unified marker and retains legacy behavior. Backend activation still requires the approved restart.

## Remaining acceptance work
1. User approval for production activation, and privileged inspection/validation of TLS certificate and complete Nginx config. DNS A resolved to 161.248.116.14, but public ingress and IPv6 still need verification. No eco server_name was found in readable active configuration.
2. Actual SMTP delivery, registration confirmation and password recovery emails. Token processing and UI were tested without sending mail.
3. Real Google consent/token exchange and linking with approved test accounts; no live token/secret exchange was attempted. Existing Google redirect configuration can remain unchanged.
4. External API/OIDC consumer acceptance after deployment; client secrets and registered redirect details were not exposed. Independent files/receipt/itinerary/VoltLab services and the personal profile website remain external.
5. Public HTTPS smoke tests, upload/download and legacy integration checks after approval. Local tests do not establish public production readiness.

Review deploy/nginx-eco.febro.id.conf and DEPLOYMENT_INSTRUCTIONS.md before approving activation. No legacy removal is part of this change.
