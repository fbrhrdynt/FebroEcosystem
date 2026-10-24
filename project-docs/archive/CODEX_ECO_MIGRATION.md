# FEBRO ECOSYSTEM — UNIFIED DOMAIN MIGRATION

You are a senior full-stack engineer, Node.js architect, and DevOps engineer working on a LIVE production VPS.

PROJECT:
- Directory: /opt/febro-ecosystem
- PM2 application: febro-ecosystem
- Current backend port: 3470
- Target domain: https://eco.febro.id
- OS: Ubuntu, Nginx, PM2, Node.js
- No Docker

MISSION:
Migrate all applications currently served under separate febro.id subdomains into one unified application using path-based routing under eco.febro.id.

This is an actual implementation task, not just a proposal.

TARGET ROUTES:
- eco.febro.id/                -> Ecosystem dashboard
- eco.febro.id/tools           -> IT Tools
- eco.febro.id/lab             -> Laboratory
- eco.febro.id/qr-generator    -> QR Generator
- eco.febro.id/converter       -> File Converter
- eco.febro.id/url-shortener   -> URL Shortener
- eco.febro.id/snippets        -> Code Snippets
- eco.febro.id/profile         -> Authentication and Account Profile
- eco.febro.id/verify          -> Document Verification
- eco.febro.id/api             -> API services, if technically compatible
- eco.febro.id/docs            -> Documentation

IMPORTANT:
The route list is the desired public architecture.
Inspect the existing source code and actual routes first.
Preserve existing internal API endpoints and callbacks where required.

PHASE 1 — FULL DISCOVERY
1. Inspect the entire repository and application structure.
2. Identify all existing subdomain-based routing.
3. Identify authentication, cookies, sessions, OAuth callbacks, CSRF and CORS settings.
4. Identify environment variables and hardcoded URLs.
5. Identify internal and external API consumers.
6. Inspect Nginx configuration using read-only commands.
7. Inspect PM2 configuration and running processes.
8. Inspect current database and persistent storage dependencies.
9. Create MIGRATION_INVENTORY.md with findings.

PHASE 2 — BACKUP AND SAFETY
1. Check Git working tree before changes.
2. Preserve existing uncommitted work.
3. Create a timestamped backup of source and relevant configuration.
4. Exclude node_modules, caches, and secrets from reports.
5. Never delete databases, uploaded files, or user accounts.
6. Never expose credentials in logs.
7. Never modify unrelated applications or Nginx virtual hosts.
8. Do not remove old subdomains during migration.

PHASE 3 — IMPLEMENT UNIFIED ROUTING
1. Implement routing for all target paths.
2. Preserve existing application functionality.
3. Create a consistent navigation system.
4. Make eco.febro.id the central application dashboard.
5. Ensure deep links work after browser refresh.
6. Update frontend links and asset paths.
7. Prevent route conflicts between SPA routes and backend API endpoints.
8. Preserve existing database records.
9. Preserve uploads and persistent storage.
10. Avoid breaking existing integrations.

PHASE 4 — ACCOUNT AND AUTHENTICATION
Move the existing authentication experience into /profile.

Requirements:
- Login
- Registration
- Account profile
- Account settings
- Password reset
- Google OAuth if currently implemented
- Session management
- Logout
- Existing user data preservation

Audit OAuth redirect URIs, cookie paths, cookie domains,
SameSite settings, CORS, CSRF, and session compatibility.

Do not expose tokens or secrets.

Do not confuse the new /profile account route with
the separate profile.febro.id personal website.

PHASE 5 — USER INTERFACE
Preserve existing working features.

Design requirements:
- Clean, modern, flat UI
- Responsive mobile-first design
- Light and dark themes
- Light-blue accent
- Follow anti-slop design principles
- No unnecessary gradients
- No oversized decorative elements
- Consistent spacing and typography

Create an ecosystem dashboard listing all available modules.

PHASE 6 — NGINX AND DEPLOYMENT
1. Inspect existing Nginx configuration.
2. Prepare eco.febro.id configuration.
3. Route traffic to 127.0.0.1:3470.
4. Check for duplicate server_name conflicts.
5. Check whether SSL certificate exists.
6. Do not assume DNS or SSL is ready.
7. Validate with nginx -t before any reload.
8. Do not modify unrelated Nginx sites.
9. Do not restart unrelated PM2 applications.
10. Preserve legacy subdomains until verification is complete.

Do not make production Nginx changes requiring elevated
privileges without explicit user approval.

PHASE 7 — TESTING
Test:
- All module routes
- Browser refresh and deep links
- Authentication
- Logout
- OAuth callback compatibility
- API requests
- File uploads
- Static assets
- Mobile navigation
- Database persistence
- Existing legacy subdomains

Run available automated tests and production build.

PHASE 8 — REPORT
Generate:
- MIGRATION_INVENTORY.md
- MIGRATION_PROGRESS.md
- MIGRATION_REPORT.md
- ROUTE_MAPPING.md
- DEPLOYMENT_INSTRUCTIONS.md

For each module report:
- Old URL
- New URL
- Source code path
- Migration status
- Test result
- Remaining issues

EXECUTION RULES:
- Work incrementally.
- Update MIGRATION_PROGRESS.md after every phase.
- Do not stop after producing a plan.
- Implement and test code changes.
- Do not claim success without tests.
- Never delete existing subdomains automatically.
- Do not change unrelated services.
- Do not deploy production changes without user approval.
- If blocked by permissions or missing credentials, document
  the blocker and continue safe independent work.
- If context is interrupted, use MIGRATION_PROGRESS.md
  to resume unfinished tasks.

START NOW:
Inspect the repository, identify all modules and existing
routes, create the inventory, and begin safe implementation.
