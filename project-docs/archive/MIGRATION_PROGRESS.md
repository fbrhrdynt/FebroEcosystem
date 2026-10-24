# Migration progress

Updated 2026-10-22. Resume here; do not rerun completed migration edits or restore live data.

| Phase | Status | Evidence / next step |
|---|---|---|
| 1 Discovery | Complete within readable permissions | MIGRATION_INVENTORY.md; private certificate inspection restricted |
| 2 Backup and safety | Complete | No Git repository; backups/unified-20261022T143753Z source/config snapshots; secrets/live data excluded |
| 3 Unified routing | Implemented and locally verified | All ten module paths, dashboard, deep links, API aliases; legacy hosts retained |
| 4 Account/auth | Implemented; external acceptance pending | Production-cookie/CSRF/login/logout/profile/reset/verification/handoff tests pass; real SMTP and Google consent pending |
| 5 UI | Complete and browser verified | Flat light-blue UI, navigation, themes; mobile API overflow fixed; mobile/desktop checks pass |
| 6 Nginx/deployment | Prepared; activation awaiting approval | deploy/nginx-eco.febro.id.conf; isolated syntax passes; production nginx -t blocked by permissions; TLS unverified |
| 7 Testing | Local suites complete | Syntax PASS; automated 9/9 PASS; Chromium 15 pages at two widths plus account flow PASS; legacy live health 10/10 PASS; no build script |
| 8 Report | Complete | MIGRATION_REPORT.md, ROUTE_MAPPING.md, DEPLOYMENT_INSTRUCTIONS.md |

## Production boundary
No Nginx changes/reloads, PM2 restarts, DNS/certificate changes, .env changes or production database writes performed. Running PID remains 52646, restart count 0, watch disabled. Public assets in this live directory may be served immediately; legacy behavior retained through marker detection.

## Next authorized work
Review reports/config, obtain explicit user approval for production activation, verify certificate/ingress using privileged read access, validate full Nginx configuration, restart only febro-ecosystem and reload Nginx per DEPLOYMENT_INSTRUCTIONS.md. Then run real email/Google and public HTTPS acceptance checks. Never remove legacy subdomains automatically.
