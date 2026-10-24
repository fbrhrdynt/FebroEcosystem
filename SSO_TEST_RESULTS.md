# SSO test results

Verified 2026-10-22 with Node v22.23.2. This is an isolated foundation test report, not production SSO acceptance.

Commands:

```
npm test --prefix /opt/febro-ecosystem/sso-phase2
npm run check --prefix /opt/febro-ecosystem
npm audit --prefix /opt/febro-ecosystem/sso-phase2 --omit=dev
```

Final isolated suite: **12 passed, 0 failed**. Existing central syntax check: PASS. Isolated dependency audit: 0 reported vulnerabilities. Node emits experimental SQLite warning; provider emits default error-renderer notice. Custom branded production error pages remain pending.

| Test area | Result | Scope |
|---|---|---|
| Provider discovery, JWKS | PASS | Actual HTTP provider; no private key in JWKS |
| Code + S256 exchange | PASS | Synthetic user, real library exchange |
| Exact redirect allowlist | PASS | Foreign URI rejected without redirect |
| Missing PKCE / wrong verifier | PASS | Rejected |
| Code replay | PASS | Second exchange rejected |
| State/browser binding | PASS | Wrong browser and reused callback rejected |
| Nonce, audience, subject, expiry claims | PASS | Provider claim assertions; maintained RP verification enabled |
| UserInfo | PASS | RP fetches profile with expected subject binding |
| Token revocation | PASS | Revoked access token fails UserInfo |
| /profile path issuer | PASS | Discovery, mount, login/consent continuation to exact RP |
| Central session required | PASS | Synthetic absent session redirects to login fixture |
| Consent CSRF / origin | PASS | Foreign origin and invalid proof rejected |
| Rate limit | PASS | Limit and bucket expiration |
| Provider storage | PASS | Secondary lookup, consumption, expiry and grant revocation |
| Account linking | PASS | Synthetic fresh dual proof, local session, CSRF, expiry, replay, identity collision; original ID retained |
| Four application adapters | PASS, contract only | Existing ID and role unchanged; blocked/suspended denied; unlinked requires proof |
| Play identity persistence | PASS, repository only | Guest remains; original IDs/history unchanged; conflicts fail; session logout/expiry |
| Existing Play guest API | PASS | Actual existing server in child process using explicit temporary DATA_DIR, fresh synthetic records only; guest cookie, start, origin denial, score bounds, save, replay and expired round |

Test setup corrections: RP initially assumed email appeared in every ID token; fixed to use UserInfo. Path-issuer test initially exposed missing middleware mount stripping; fixed with provider/mount.mjs. Final suite passes after both fixes.

## Not tested / not complete

- Real Google login, Google link collision and email login through the integrated new provider.
- Existing local login for each full app, especially Itinerary restoration and existing Google method preservation.
- Native database-backed application session issuance, HTTP account-link endpoints and branded browser UI.
- Real document/project/file ownership and admin access through each application's endpoints using synthetic datasets.
- Authenticated Play HTTP login-to-score flow and complete browser gameplay; only repository behavior plus existing guest API were exercised.
- Secure cookie behavior over actual HTTPS, persistent key rotation, full RP-initiated logout and central revocation propagation to application sessions.
- Full PostgreSQL migration/reversal, database backup restore rehearsal and concurrency load tests.

No production users were signed in, created, linked, merged, modified or deleted by testing. The schema inspection script reads metadata only and is not an automated user-data test.
