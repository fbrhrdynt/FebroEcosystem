# Febro Space centralized SSO architecture

Status: isolated provider/RP implementation and adapter cores tested; production integration is incomplete and disabled.

## Protocol and issuer

Use OAuth 2.0 Authorization Code with mandatory S256 PKCE and OpenID Connect. Selected implementation: oidc-provider 9.12.2 and openid-client 6.8.4, pinned with a separate lockfile under sso-phase2. The upstream provider is OpenID Certified; our configuration, session integration and deployment are NOT thereby certified. Reference: https://github.com/panva/node-oidc-provider . RP reference: https://github.com/panva/openid-client . New code does not extend src/oidc.mjs.

Canonical new issuer: https://eco.febro.id/profile (exact string, no trailing slash). OIDC discovery: https://eco.febro.id/profile/.well-known/openid-configuration. Provider metadata supplies authorization, token, JWKS, UserInfo, revocation and end-session endpoints. Clients must discover them, never concatenate hardcoded legacy endpoints or truncate the issuer with URL.origin.

The existing https://auth.febro.id issuer remains operational throughout transition. It is a DIFFERENT security namespace even if subject strings are equal. Never silently treat (legacy issuer, sub) as (new issuer, sub). Stable public new subjects are existing central users.id; no regeneration or email-derived IDs. Pairwise subjects are not enabled because existing central IDs must remain stable.

Per-app registrations are in SSO_APPLICATION_MAPPING.md. Each uses a unique confidential client and secret, client_secret_basic, code-only response and authorization_code-only grant. Exact redirect allowlists, no wildcard hosts/paths, no dynamic registration. No refresh tokens in this phase. No access or ID tokens reach frontend URLs, storage or logs. Only short-lived authorization code/state appears on standard callback URLs; callback logging and referrers must be disabled/sanitized.

```mermaid
sequenceDiagram
 participant Browser
 participant App as Application backend
 participant OP as eco.febro.id/profile
 participant Local as Local account database
 Browser->>App: Login with Febro Space
 App->>App: Save browser-bound state, nonce, verifier, destination
 App-->>Browser: Redirect to discovered authorization endpoint
 Browser->>OP: Authorization request + S256 challenge
 OP->>OP: Read existing central server session
 OP-->>Browser: Existing branded login if needed; explicit consent
 OP-->>Browser: Exact registered callback + code + state
 Browser->>App: Callback
 App->>OP: Authenticated code exchange + verifier
 OP-->>App: ID token + short-lived access token
 App->>OP: UserInfo with subject verification
 App->>Local: Resolve (issuer,subject) to original local ID
 Local-->>App: Local status, roles, permissions
 App-->>Browser: New host-only local session + safe original destination
```

## Central session integration

provider/provider.mjs is a factory and cannot start a listener or read production credentials. Persistent private JWKs, rotating strong cookie signing keys, explicit client registrations, dedicated provider database, authoritative findIdentity and allowApp callbacks must be supplied by the host. Store provider state separately from the central business DB. Long/short cookies are HttpOnly, Secure and SameSite=Lax outside explicitly enabled local test mode. TTL: access/ID tokens 300 seconds, code 60 seconds, interaction 600 seconds, provider session/grant eight hours. Persistent key rotation must overlap old public keys until old tokens expire.

provider/mount.mjs adapts the /profile path to the provider router. Mount only discovered protocol routes and /profile/interaction/:uid BEFORE the current profile route handler; preserve all existing profile assets and branding. Do not send every /profile page to provider middleware. provider/interactions.mjs authenticates through a host-supplied server-side session reader, rejects disabled/unverified users and app-denied users, checks current central identity at consent, validates one-time origin-bound CSRF, and offers cancel. No user ID from browser is trusted. The interaction HTML is an isolated functional fixture; it is not production branded UI.

Unfinished host work: persist a bounded pending interaction in the central server session and resume it after EXISTING email/Google login. Current UI does not implement the returnTo parameter emitted by the isolated interaction fixture. Do not ship it as-is: that would lose authorization continuity. Add Google nonce in an isolated auth copy and retain explicit existing-account linking. Require fresh reauthentication for link operations (max_age/prompt alone must not accept an old central app cookie as fresh proof). No bearer handoff protocol is introduced.

Apply provider/http-guard.mjs and ingress limits; its socket-only rate key needs a tested trusted-proxy adapter for Nginx so all clients do not share one bucket. Enforce HTTPS and trusted host at the host boundary. Use fixed event audit identifiers, minimal actor/client IDs where appropriate, bounded retention and access controls. Never pass raw exceptions, request query strings, credentials or tokens to audit sinks. Local limiter is single-process; distributed deployments need a shared store.

## Explicit account linking

1. User signs in with their EXISTING local method and reauthenticates within five minutes. Preserve current local ID and verify active/non-suspended state.
2. User explicitly chooses Connect Febro Space, initiating browser-bound SSO with fresh central authentication. Store pending identity only server-side for at most five minutes.
3. Show explicit confirmation with both account identities. Require local session binding, one-use CSRF and exact Origin.
4. In a local database transaction, recheck the current local account status and uniqueness of (issuer,subject) and (issuer,local_id); insert a link to the original local ID. Audit the link; regenerate local session. Do not update role, permission, email, ownership or user ID.
5. Identity conflict aborts without changing either account. Email can help the UI find an account, but is never ownership proof or a join key. New-account creation requires explicit registration and least-privilege policy; it is disabled in the adapter core.

adapters/identity-links.mjs implements and tests proof/session/CSRF/expiry/uniqueness in synthetic SQLite. Its freshness inputs must originate from trusted server reauthentication, never HTTP form fields. It is not a production PostgreSQL migration. For PostgreSQL use a native typed local foreign key and perform proof-consumption, local status check and insertion in the same transaction. Do not implement cross-database partial commits.

adapters/application-policy.mjs supplies app configuration and local-user authorization checks for four apps. It deliberately resolves only issuer+subject, never email, then delegates session issuance to the app's existing session adapter. Concrete native HTTP routes, UI, database migrations and session adapters are still required.

## Play

Guest gameplay and existing anonymous leaderboard remain available without IdP redirects. New authenticated leaderboard session is separate from fa_player. adapters/play-identities.mjs adds issuer+subject -> existing player ID plus hashed eight-hour authenticated sessions. First login may create a new player, or explicitly claim the CURRENT guest player after fresh SSO + current HttpOnly guest credential + CSRF confirmation. A linked identity always selects its original player. If a second guest player already has runs, preserve both histories; no automatic transfer or score merge. Identity uniqueness prevents claiming another linked player.

The authenticated session selects the player server-side; ignore any client-submitted player/subject. Preserve run IDs, single-use finish transaction, elapsed time/mechanical score checks and daily/IP limits. Existing runs remain immutable; bests remain derived caches under current rules. Local logout removes authenticated session and resumes guest mode. Optional Login UI, callback/confirmation routes, authenticated player selection in actual score APIs and browser tests are pending. Anti-abuse is plausibility checking, not proof against a modified game client.

## Logout and authorization

Local logout is POST with CSRF/exact Origin, revokes local database session and clears host-only cookie; it must work when IdP is unavailable. Optional explicit Sign out of Febro Space uses discovered RP-initiated logout and exact registered post-logout destination. Provider revocation is available for opaque access tokens. Local application sessions do not automatically die on central logout or central app revocation: implement bounded revalidation/backchannel logout before claiming global logout/revocation coverage. Existing per-app status/admin checks remain authoritative on protected requests, not only at login. No role claims are imported.
