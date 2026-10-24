# Febro Arcade — Unified Monorepo v1.5

Project root: `/opt/play` · Public domain: `https://play.febro.id` · No Docker

## Layout

```
/opt/play/
├── public/             # ONLY directory publicly served by Nginx
│   ├── index.html      # Arcade dashboard
│   ├── skyhop/         # SKYHOP game
│   ├── snake/          # Neon Snake game
│   ├── orbit-run/      # Orbit Run game
│   ├── tribeworld/     # TribeWorld frontend + cloud save UI
│   ├── GhaffiLand/     # GhaffiLand v0.4 (17 YouTube videos via embed)
│   ├── leaderboard/    # Global leaderboard UI
│   └── assets/         # Shared assets
├── source/
│   └── ghaffiland/     # React/TypeScript source, NOT exposed by Nginx
├── services/
│   ├── leaderboard/    # Node backend /api/leaderboard/ on port 3488
│   └── tribeworld/    # Node backend /api/tribeworld/ on port 3491
├── storage/            # SQLite databases, sessions, private backup: .gitignored
├── backups/            # Migration safety copies: .gitignored
├── deploy/
│   └── play.febro.id.conf
└── scripts/
    └── migrate.py
```

Website URLs are **unchanged** because Nginx `root` changes to `/opt/play/public`.

## Migrating an existing VPS

See `INSTALL-VPS.md` for step-by-step migration, backup and PM2 commands. Migrate via `sudo python3 scripts/migrate.py --apply`; the script only modifies the single `play.febro.id` vhost and preserves its previous version in `/opt/play/backups/`. No other vhost is touched.

## GitHub

All source assets and both Node backends are under `/opt/play` and are ready for a single Git repository. **Runtime SQLite, private backup, tokens, and `.env` are intentionally ignored by git.** Never upload authentication databases or player data to a public GitHub repository.

When rebuilding GhaffiLand, its source is in `source/ghaffiland`. The live static assets are in `public/GhaffiLand`; deploying the source build requires replacing its built files, not starting a React server.

## Dependencies

- Frontend: static HTML/CSS/JavaScript; GhaffiLand frontend already prebuilt.
- APIs: Node >=22.13 for built-in `node:sqlite` (backend uses zero external packages).
- PM2 runs two small services. Nginx is the only public-facing server.
