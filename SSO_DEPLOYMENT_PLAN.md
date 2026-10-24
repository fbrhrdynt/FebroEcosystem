# Deployment plan — approval required per application

Status: NOT executable yet. Complete open implementation and testing work in SSO_IMPLEMENTATION_PROGRESS.md first. This document authorizes no deployment, PM2 restart, Nginx reload, DNS/SSL change or production migration. No such operations were executed.

## Sequence and approval gates

Central provider staging first, then central production activation as its own explicitly approved change. Preserve the legacy issuer and all registrations. Proposed app sequence: Lamariva, Itinerary, VoltLab, Files, Play. Each app has an independent backup, migration, acceptance and rollback gate; wait for explicit approval for that named app and exact artifact before production deployment. Never batch app rollouts. Keep the new button feature-disabled until the app gate passes; do not force existing sessions to migrate.

A concrete approval request must identify tested artifact checksum/version, exact files/config, database migration SQL, backup/restore evidence, expected downtime, redacted OAuth registrations and rollback commands/process ownership. Itinerary process manager must be identified before writing restart commands; absence from ubuntu PM2 is not permission to create or restart a process.

## Backup procedure (planned, not executed)

1. Create access-restricted timestamped backup location outside web roots. Record app artifact checksums and deployed process configuration without copying credentials into reports. Keep secrets/keys in encrypted, separately access-controlled backup storage.
2. PostgreSQL apps: use a restricted operational backup account and custom-format pg_dump for the discovered app database. Supply credentials through a protected pgpass/service file, never a command-line URL. Capture schema/migration version. Restore the dump to a separate isolated database and verify constraints and synthetic test fixture accessibility before approving migration.
3. Central, Files and Play SQLite: use SQLite online backup API or .backup, not a raw copy of the main file while WAL is active. Validate destination with integrity_check and foreign_key_check. Back up provider state/signing keys/cookie keys separately for rollback; never regenerate keys accidentally on restart.
4. Files: take a consistent storage snapshot of data/vault and its metadata backup. Preserve storage keys, node IDs, share tokens and quotas; encrypted backup remains outside public roots. Central private documents and any Lamariva export storage also require coordinated file/DB backup according to their actual storage layout.
5. Record checksums, ownership/permissions, restoration steps and retention. Do not claim an untested archive is a verified backup. Avoid full database restore on routine application rollback because it could erase writes made after cutover.

## Database migration procedure

Migration SQL is still to be authored and tested in native app databases. Do not run the synthetic SQLite repository DDL directly on PostgreSQL. Required pattern:

- Add external_identities with immutable issuer, subject, local_user_id (native type), linked_at, and uniqueness on (issuer,subject) and (issuer,local_user_id), plus foreign key to the real local user table. Lamariva: UUID/text as confirmed by metadata; Itinerary: bigint; VoltLab: uuid; Files: text accounts.sub. Verify actual types and constraints before applying.
- Add one-use server-side link intents and RP flow storage with expiry and session binding. Hash bearer session/intent credentials. Apply cleanup indexes and retention.
- No backfill by email. Existing legacy links stay untouched. A legacy central subject string alone is not proof for a new issuer. Existing native sessions and local methods continue to function.
- Play adds identity mapping to players.id and separate authenticated sessions, with FKs and unique constraints. No UPDATE of runs/player_id or DELETE of old bests. Preserve all historical records.
- Apply additive migrations in transaction where supported. Verify schema, FKs, indexes, row-count invariants and ownership invariants without dumping personal data into logs. If any unexpected changes occur, stop and roll back before activation.
- Keep new schema on code rollback if it is unused and harmless. Drop only after explicit later review confirms no linked accounts or writes depend on it. Never delete databases or reset passwords.

## Central provider gate

- Complete same-host mounting, branded login/consent/errors and bounded interaction continuation through existing email/Google workflows.
- Supply dedicated provider state database, persistent JWKs, rotating cookie keys and separate per-app client secrets. Register exact redirects/post-logout destinations; reject unexpected clients/hosts. Include explicit client-to-central-app mapping for Lamariva and Play, currently absent from central target catalog.
- Google OAuth production redirect remains the actual configured eco callback unless deliberately migrated with independent approval. Add staging redirect to a separate test OAuth client. Never reuse production credentials in automated testing.
- Test user block, per-app deny and revalidation policy. Integrate audit sink and expiry cleanup; test key rotation/restart persistence and secure cookies over HTTPS.
- Preserve existing profile routes/UI and legacy issuer. Review callback access/error logs on every affected vhost; no code/token/credential logging.

## Per-application rollout and rollback

| App | Changes and acceptance gate | Rollback |
|---|---|---|
| Lamariva | Add generic OIDC adapter through supported better-auth APIs, explicit linking and Login with Febro Space. Remove Google implicit email linking while keeping existing linked Google accounts working. Preserve user.id, account uniqueness, document/profile/application/saved-job ownership, role/permissions/suspended. Test all existing methods, regular/admin/suspended synthetic users, link collisions, saved document/export access. | Disable v2 button/routes; restore previous artifact and exact auth configuration. Retain additive mapping rows; existing better-auth sessions/accounts remain. No account deletion or ID rewrite. |
| Itinerary | Restore existing bcrypt password login with CSRF/rate limits and session regeneration. Add discoverable path issuer alongside legacy login. Native bigint mapping; keep users.febro_sub and trip owners/members unchanged. Test Administrator/User, hold/blocked, group membership, expense permissions, safe return destination and existing link password proof. | Disable v2 feature and restore previous tested artifact/process config under its actual manager. Leave existing febro_sub/password hashes and additive mapping intact. Verify old SSO/password behavior from the approved rollback artifact. |
| VoltLab | Replace email-only Google auto-link with explicit ownership proof, keep existing google_sub login, add v2 mapping to users.id. Retain workspaces.owner_id and local admin/reserved-username rules. Test blocked users, existing projects, OAuth collisions and admin enforcement. | Disable v2 and restore approved auth artifact without undoing workspace writes. Keep all existing Google mappings and native sessions. Do not restore the insecure auto-link behavior without a separately assessed decision. |
| Files | Move RP verification/discovery to maintained library; preserve full issuer path. Separate new external identity mapping to ORIGINAL accounts.sub; keep legacy /auth/start working. Test files/folders/quotas, blocked/admin, existing shares and downloads with explicit dual-identity link. | Switch off v2 routes/button; keep legacy issuer client and local sessions operational. Never rewrite accounts.sub, nodes.owner_sub or storage keys. Preserve additive mappings and vault data. |
| Play | Add optional Login with Febro Space and explicit guest claim consent. Resolve authenticated player on score endpoints, with HttpOnly secure authenticated cookie; anonymous route access remains. Test guest gameplay, start/finish abuse, replay, multiple browsers, login/logout/expiry, identity conflict, existing old runs and best-score rules. | Disable authenticated UI/routes and player-session resolution; restore guest API artifact. Keep original players/runs/bests unchanged and mapping tables dormant. No scores are deleted or overwritten. |

Roll back immediately on ownership mismatch, changed local roles, login loop, lost legacy access, unauthenticated protected data, score-history loss, token leakage or sustained provider/session failure. Disable new login first while preserving local logout and existing sessions; then restore tested artifact. Reconcile any new writes before considering database restore.

## Account linking instructions for users

1. Sign in to the application using your existing login method.
2. Open account settings and choose Connect Febro Space.
3. Reauthenticate to the local account and sign in to the intended Febro Space identity when prompted.
4. Confirm the two accounts shown. Existing content and permissions remain with the same application account.
5. If already-linked or ownership conflict appears, stop and contact support; do not create duplicate accounts or request an email-based merge.

Files users must establish their existing Files session via legacy Febro login first. Play users may continue as Guest; saving to a signed-in identity is optional. Claim current guest progress only after explicit confirmation. If the signed-in identity already owns a player, both histories are retained separately; no merge is promised.

## Required release checklist for EACH app

- Verified backups and isolated restore; reviewed additive migration and rollback.
- Google, email and existing local login; v2 SSO; explicit dual-ownership linking; collisions/replay/CSRF/PKCE; exact redirect deny cases.
- Valid/expired/blocked/revoked sessions, local logout and optional central logout; safe original destinations; IdP outage; no redirect loops.
- Unauthorized data denial and existing admin roles/permissions; existing document/project/file/score access through real app endpoints using isolated synthetic fixtures.
- Secure HTTPS cookies, no sensitive URL/log output, rate limiting and audit events.
- Play additionally: guest access without any login, authenticated score association, run replay/abuse rejection and unchanged historical records.
- Written exact-app approval after evidence is available. Only then schedule the approved deployment action.
