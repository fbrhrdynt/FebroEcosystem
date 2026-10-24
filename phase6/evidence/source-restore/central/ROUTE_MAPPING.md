# Route mapping

All rows are implemented and tested locally; production activation awaits approval. Shared backend: src/server.mjs; shared UI: public/app.js.

| Module | Old URL | New URL | Source shell | Status | Test result | Remaining issues |
|---|---|---|---|---|---|---|
| IT Tools | https://tools.febro.id | https://eco.febro.id/tools | public/sites/tools.html | Implemented, not activated | HTTP + browser pass | Public ingress verification after approval. |
| Laboratory | https://lab.febro.id | https://eco.febro.id/lab | public/sites/lab.html | Implemented, not activated | HTTP + browser pass | Independent projects remain external services. |
| QR Generator | https://qr.febro.id | https://eco.febro.id/qr-generator | public/sites/qr.html | Implemented, not activated | HTTP + browser pass | Public ingress verification after approval. |
| File Converter | https://convert.febro.id | https://eco.febro.id/converter | public/sites/convert.html | Implemented, not activated | HTTP + browser pass | Additional file fixtures can be checked after deployment. |
| URL Shortener | https://short.febro.id | https://eco.febro.id/url-shortener | public/sites/short.html | Implemented, not activated | HTTP + browser pass | Public ingress verification after approval. |
| Code Snippets | https://snip.febro.id | https://eco.febro.id/snippets | public/sites/snip.html | Implemented, not activated | HTTP + browser pass | Public ingress verification after approval. |
| Account | https://auth.febro.id | https://eco.febro.id/profile | public/sites/auth.html | Implemented, not activated | HTTP + browser pass | Real SMTP delivery and Google consent/token exchange pending; legacy callback supported. |
| Document Verification | https://verify.febro.id | https://eco.febro.id/verify | public/sites/verify.html | Implemented, not activated | HTTP + browser pass | Public ingress verification after approval. |
| API Services | https://api.febro.id | https://eco.febro.id/api | public/sites/api.html | Implemented, not activated | HTTP + browser pass | External consumer acceptance pending; legacy endpoints/issuer retained. |
| Documentation | https://docs.febro.id | https://eco.febro.id/docs | public/sites/docs.html | Implemented, not activated | HTTP + browser pass | Public ingress verification after approval. |
| Dashboard | — | https://eco.febro.id/ | public/sites/dashboard.html | Implemented, not activated | HTTP + browser pass | Public ingress verification after approval. |

## Deep links and compatibility

- Account: /profile/register, /profile/forgot, /profile/reset, /profile/account, /profile/console (existing admin control center).
- Snippets: /snippets/s/:id; docs: /docs/article/:slug; verification: /verify/v/:id; short links: /url-shortener/:code.
- Module API aliases: /<module>/v1/... (for example /api/v1/api/uuid). Root /v1/... remains available on eco; legacy host routes are retained.
- Static assets remain /assets/* and /favicon.svg. OpenAPI: /docs/openapi.yaml. Unknown API requests return JSON 404, never SPA HTML.
- Legacy OIDC issuer, discovery and /oauth/* remain at auth.febro.id. They are intentionally not moved.
- Google default callback remains https://auth.febro.id/auth/google/callback. Unified initiation bridges there; single-use handoff establishes an eco session afterward. Linking bridges the current identity first. Optional eco callback /profile/auth/google/callback requires matching Google console registration and environment setting.
- Receipt, itinerary, files, VoltLab and personal profile website run independently; their URLs and services remain untouched.
