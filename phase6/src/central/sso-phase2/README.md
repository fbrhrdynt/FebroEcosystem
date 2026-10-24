# Isolated Febro Space OIDC foundation

This directory is not mounted by any production application. There is no start script, environment loader, generated production key, production client secret or deployment script. It is intentionally a tested foundation pending native application integration.

Run `npm ci --ignore-scripts` and `npm test` here. Tests use memory or temporary isolated SQLite, ephemeral loopback HTTP servers and synthetic identities. One guest API test starts the actual existing Play service with an explicit fresh temporary DATA_DIR and test-only origin; no production DB is opened by tests. The metadata inspection utility is a separate read-only discovery tool and is not part of npm test.

- provider/: maintained provider configuration, dedicated persistence, Node path mounting, authenticated interaction/CSRF handling, rate limiter.
- adapters/: maintained OIDC RP flow, explicit link-proof repository, four local application policy/controller cores, additive Play identity/session repository.
- tests/: HTTP protocol, interaction security, persistence, linking, local policy and guest leaderboard tests.
- evidence/schema-metadata.json: live schema metadata only; no user records or credentials.

Before host integration: complete login/Google continuation and fresh reauthentication, replace fixture HTML with preserved existing branding, supply trusted callbacks/production persistence, and implement native HTTP/session adapters. Read ../SSO_IMPLEMENTATION_PROGRESS.md and ../SSO_DEPLOYMENT_PLAN.md. Do not deploy this directory directly.
