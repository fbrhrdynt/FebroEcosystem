# Application mapping

| App | Actual source | Process / listener | Nginx host | Identity and ownership |
|---|---|---|---|---|
| Febro Space | /opt/febro-ecosystem | febro-ecosystem / 3470 | eco.febro.id; legacy auth and module hosts | SQLite users.id; sessions.user_id; documents.owner_id, snippets/links.user_id; central control-plane app restrictions |
| Lamariva | /opt/lamariva | lamariva / 3035 | cv.febro.id | PostgreSQL Prisma user.id UUID; account(providerId,accountId) unique; session.userId; Document/Profile/Application/SavedJob/exports/tickets userId; role, permissions, suspended |
| Itinerary | /opt/ls_itinerary | node server.js, absent ubuntu PM2 list / 3015 | itinerary.febro.id | PostgreSQL users.id BIGSERIAL; febro_sub unique; trips.owner_id, trip_members.user_id, created_by; Administrator/User and active/hold/blocked |
| VoltLab | /opt/voltlab | voltlab / 3025 | voltlab.febro.id | PostgreSQL users.id UUID; google_sub unique; sessions.user_id; workspaces.owner_id; status and policy.mjs admin policy |
| Files | /opt/febro-files | febro-files / 3480 | files.febro.id | SQLite accounts.sub; sessions.sub, nodes.owner_sub, share_links.owner_sub; quotas, blocked and existing admin policy |
| Play | /opt/play/public; /opt/play/services/leaderboard | febro-arcade-api / 3488 | play.febro.id static root, API proxy | SQLite arcade.sqlite players.id; sessions/runs/bests.player_id. Separate tribeworld-save / 3491 is not the leaderboard and must remain untouched |

## Existing authentication entry points

- Lamariva: /api/auth/[...all] via better-auth, email/password, verification, Google. Seven-day database sessions, secure cookies based on APP_URL. Keep local authorization hooks and suspended checks.
- Itinerary: /login, /auth/febro, /auth/google, /auth/febro/callback, /auth/link and POST /logout. jose verifies legacy tokens and additionally requires custom token_use=id. Express PostgreSQL sessions regenerate on login, 14-day secure Lax cookies. Existing link prompts old password. Local login is currently disabled and must be restored in an isolated copy before rollout.
- VoltLab: /api/auth/google and callback, /api/auth/me/logout/admin. Database sessions hashed, seven days, __Host-voltlab-session. Google has state/nonce/PKCE; callback currently attaches google_sub using email collision. Do not replicate that linking.
- Files: /auth/start, /auth/callback, POST /auth/logout. Already legacy OIDC only. State cookie + database flow, nonce, PKCE; handwritten JWT verification. Current issuer parsing uses URL.origin, so a path issuer is lost. It must use discovery + maintained RP verification before migrating to /profile issuer. Preserve accounts.sub and node ownership through a separate external identity mapping.
- Play: /api/leaderboard/me/profile/start/finish/top/mine. fa_player bearer cookie establishes anonymous player. Guest gameplay and scoreboard work without central authentication. Existing score protections: server round IDs, one-time finish transaction, elapsed-time mechanical bounds, per-IP and daily limits. No central authenticated identity exists yet.

## Proposed client registrations (not installed)

| client_id | Exact production redirect URI |
|---|---|
| febro-lamariva-v2 | https://cv.febro.id/auth/febro/callback |
| febro-itinerary-v2 | https://itinerary.febro.id/auth/febro/callback |
| febro-voltlab-v2 | https://voltlab.febro.id/api/auth/febro/callback |
| febro-files-v2 | https://files.febro.id/auth/febro/callback |
| febro-play-v2 | https://play.febro.id/api/leaderboard/auth/callback |

Keep legacy registrations during transition. New IDs must map explicitly to central app restrictions; do not derive permission names by stripping prefixes.
