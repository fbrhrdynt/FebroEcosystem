# Status enam aplikasi

Semua kandidat ada di phase5/src/<app>, **belum boleh aktivasi produksi**. Tidak ada metode login legacy dihapus. Inventaris mesin aktual: evidence/application-inventory.json, services-before.json, preservation.json.

| Aplikasi | Source produksi / port / pengelola | Auth dan DB | Hasil kandidat / ownership |
|---|---|---|---|
| Febro Space | /opt/febro-ecosystem /3470/ PM2 febro-ecosystem | Email/password/Google dan sesi SQLite data/ecosystem.sqlite; provider baru terpisah | Dependency pusat dipatch; bridge fresh session, protokol dan legacy regression diuji. users.id tetap. |
| Lamariva | /opt/lamariva /3035/ PM2 lamariva | better-auth email/password/Google; PostgreSQL 127.0.0.1:5432/lamariva | Next dipatch dan batas tracing build dikunci pada direktori kandidat; native signed-cookie, link eksplisit dan Document.userId asli diuji, cross-user access ditolak. |
| Itinerary | /opt/ls_itinerary /3015/ systemd ls-itinerary.service | Legacy OIDC/password; PostgreSQL 127.0.0.1:5432/logisource_itinerary | Password fallback kandidat dan /auth/space; trips.owner_id, collaborator/role native dipertahankan; dependency dipatch. Tidak dibuat PM2 duplikat. |
| VoltLab | /opt/voltlab /3025/ PM2 voltlab | Google/admin password, hashed session PostgreSQL 127.0.0.1:5432/voltlab | Native session, project/workspace pemilik, role/admin isolation dan collision diuji; learning progress tidak dipindah. |
| Files | /opt/febro-files /3480/ PM2 febro-files | Legacy OIDC, SQLite /opt/febro-files/data/files.sqlite | Mapping ke accounts.sub asli, nodes.owner_sub, quota/share/download/native regression; vault/storage dipertahankan. |
| Play | /opt/play/public dan services/leaderboard /3488/ PM2 febro-arcade-api | Guest cookie dan SQLite /opt/play/storage/leaderboard/arcade.sqlite | Guest tetap tanpa login; sesi SSO opsional terpisah; server memilih pemain, score/runs/bests historis tidak digabung otomatis. |

Dependency aplikasi pusat: busboy, google-auth-library, nodemailer, pdf-lib/pdfjs-dist/qrcode. Lamariva: Next/React, better-auth, Prisma/pg, renderer/docx. Itinerary: Express/session/pg, bcrypt/jose. VoltLab: Next/React/pg/jose. Files dan Play memakai Node/SQLite serta runtime SSO independen. Versi package manifest live lengkap ada di evidence/preservation.json; lockfile kandidat disertakan artefak.

Masing-masing RP menukar code dan memverifikasi identitas melalui openid-client sebelum menerbitkan sesi native sendiri. Tidak membuat akun berdasarkan email. Role tidak diimpor dari IdP. Uji pengaitan, konflik, pemilik dan restart memakai database sintetis, bukan akun pengguna asli. Backup ownership asli diverifikasi offline; tidak ada migrasi data produksi.

Semua readiness: **siap review artefak / belum acceptance HTTPS dan Google / belum produksi**. Native sessions aplikasi lain tetap mengikuti masa berlaku lokal saat central logout. Rollout Itinerary hanya oleh operator systemd yang berwenang, sesudah approval terpisah.
