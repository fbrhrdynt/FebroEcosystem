# Febro Account — SSO blueprint for existing applications

Auth issuer: `https://auth.febro.id`

The package adds a registered-client OpenID Connect bridge to Febro Ecosystem. Files is the first registered client. It uses the **same underlying Febro Account user id (`sub`)** and verified email, and it does not store a second password.

## OIDC endpoints
- Discovery: `https://auth.febro.id/.well-known/openid-configuration`
- Authorization: `https://auth.febro.id/oauth/authorize`
- Token: `https://auth.febro.id/oauth/token`
- Userinfo: `https://auth.febro.id/oauth/userinfo`
- JWKS: `https://auth.febro.id/oauth/jwks`
- Flow: Authorization Code + PKCE S256, signed RS256 ID tokens, one-time codes with 60-second TTL, confidential client secret, 300-second access/ID tokens

### Adding an existing Node.js application later

1. Decide exact redirect URL (e.g. `https://voltlab.febro.id/auth/febro/callback`).
2. Back up the old application and its user database; do not delete existing Google/email login records.
3. Register a **distinct** OIDC client in `/opt/febro-ecosystem/data/oidc-clients.json` with unique high-entropy `client_id`, `client_secret`, and explicitly allowlisted HTTPS `redirect_uris`. Keep JSON permissions `0600` and folder `0700`.
4. In the app, implement Authorization Code + PKCE S256 and exact `state` + `nonce` validation using a proven OIDC client library if possible. Server-side exchange must send client secret confidentially. Do not put client secrets in client JS or browser storage.
5. Verify ID token RS256 using the provider JWKS, validate `iss`, `aud`, `exp`, `iat`, `nonce`, and `email_verified`. Link local accounts to the immutable `sub` (not only email). When a user logs in with matching email, require authentication to the existing local account **before linking** to avoid account takeover.
6. Keep application-specific roles and permissions (e.g. supervisor, operator, admin) local. Being an authenticated Febro account does not automatically confer admin access.
7. Add sign-in via Febro Account to the app login screen and test on staging. Gradually switch the default sign-in after previous users are linked. Logout from one app clears that app's local session; global logout/revocation is not yet implemented.

### Target migration map

| App | Known deployment | Migration constraints |
|---|---|---|
| VoltLab | `voltlab.febro.id` (PM2 `voltlab`, port 3025) | Existing Google login and admin accounts; preserve canvases and user workspaces |
| Itinerary | `itinerary.febro.id` (systemd on port 3015) | Preserve membership, trip ownership, invited users, admin permissions |
| Receipt | `receipt.febro.id` (PM2 `ls-receipt`, port 3101) | Preserve old receipt workflows and user data; only enable account login if repository supports it |
| DWM | `dwm.logisourcedigital.web.id` (PM2 `dwm`, port 3020) | **Do not merge user roles**: operator/supervisor/admin and project assignments must remain local; request explicit authorization for any cross-domain auth switch |
| LS Inventory | `LS_Inventory_Central` | Preserve tenant/client isolation and device-specific inventory permissions |

These apps are **not migrated by this package**. Their code must be inspected and changed individually once the repositories are provided. The identity provider bridge supports future integrations, but connecting an app is not automatic.

## Security and limitations

- Do not share session cookies using `Domain=.febro.id`; each app creates its own host-only secure session after OIDC validation.
- No automatic merging of users by matching email alone.
- OIDC bridge implements the core registered-client authorization code flow for known applications. It is **not a certified complete OIDC provider**, and has no refresh tokens, MFA, RP-initiated global logout, dynamic client registration or consent UI. For internet-scale multi-client deployments, adopt a maintained audited IdP such as Keycloak/Zitadel/Auth0 rather than extending custom auth indefinitely.
- Rotate and protect the RSA private key at `/opt/febro-ecosystem/data/oidc-private.pem`; do not store in a public repository.
