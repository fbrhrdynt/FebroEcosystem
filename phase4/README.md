# Febro Space Phase 4 — isolated implementation

Production source, .env, accounts, ownership, PM2 and Nginx are unchanged. Working integrations are in `apps/{central,lamariva,itinerary,voltlab,files,play}`. These are release candidates, not deployed applications.

`runtime` is the canonical shared OIDC implementation. Run `python3 scripts/sync-runtime.py` from anywhere before preparing new artifacts. Each app receives its own `sso` directory and pinned independent dependency lockfile. Development symlinks to installed dependencies are excluded from releases; an actual release runs `npm ci` in its own `sso` directory.

From `/opt/febro-ecosystem`:

```sh
node --test phase4/tests/*.test.mjs
python3 phase4/scripts/check-all.py
node phase4/scripts/migrate.mjs files --dry-run
python3 phase4/scripts/release.py verify files
```

Tests use isolated synthetic SQLite/PostgreSQL fixtures and loopback ports. Native app tests start temporary application processes; they never restart existing services. Chromium validates mobile/desktop login and logout. A synthetic OP interaction harness is used in application tests; the actual central interaction/session bridge is separately tested. Public trusted HTTPS staging, real Google acceptance and production activation are explicitly not certified by these tests.

See the root `SSO_PHASE4_*.md` reports for backup, migration, security, and gated activation instructions. No approval record is created automatically. Source rollback never restores a database or deletes user-created data.
