# Status aplikasi Phase 4

Seluruh perubahan berikut hanya ada pada kandidat staging. Tidak satu pun integrasi baru diaktifkan di produksi.

| Aplikasi | Implementasi staging | Kesiapan aktivasi produksi |
|---|---|---|
| Febro Space | Kode nyata tersedia; pengujian terkait lulus | **BELUM SIAP**; gate pada uraian di bawah |
| Lamariva | Kode nyata tersedia; pengujian terkait lulus | **BELUM SIAP**; gate pada uraian di bawah |
| Itinerary | Kode nyata tersedia; pengujian terkait lulus | **BELUM SIAP**; gate pada uraian di bawah |
| VoltLab | Kode nyata tersedia; pengujian terkait lulus | **BELUM SIAP**; gate pada uraian di bawah |
| Files | Kode nyata tersedia; pengujian terkait lulus | **BELUM SIAP**; gate pada uraian di bawah |
| Play | Kode nyata tersedia; pengujian terkait lulus | **BELUM SIAP**; gate pada uraian di bawah |

## Febro Space

Autentikasi awal: SQLite email/password/Google, sesi native dan issuer legacy.

Perubahan: Provider OIDC terpelihara, mount /profile, key persisten, fresh reauthentication, nonce Google, rotasi refresh, logout, rate limit dan audit.

Berkas native berubah/baru:

- `public/app.js`
- `src/control-plane.mjs`
- `src/febro-provider.mjs`
- `src/auth.mjs`
- `src/server.mjs`

Ditambah `15` berkas runtime server-only `sso/`; daftar lengkap dan checksum berada pada `phase4/releases/central/manifest.json`. Tidak ada .env, database, upload atau signing secret dalam artefak.

Pengujian: discovery/path issuer, PKCE S256, nonce/state, redirect, fresh login, consent/CSRF, code replay, refresh rotation/reuse, revocation, persistent keys dan restart provider. Login/password/authorization lama lulus regresi. Google nyata dan penerimaan publik stack baru belum diuji.

Blocker: Dependency pusat masih 1 high + 2 moderate; HTTPS staging dan credential/registrasi nyata belum diterima.

Perintah pemeriksaan aman: `python3 phase4/scripts/release.py verify central`. Dry-run migrasi: provider memakai state database terpisah dan tidak memigrasikan users pusat.

Deployment setelah approval dan acceptance: `python3 phase4/scripts/release.py deploy central /absolute/path/to/reviewed-central-approval.json`. Rollback memerlukan approval terpisah operation=rollback: `python3 phase4/scripts/release.py rollback central /absolute/path/to/reviewed-central-rollback-approval.json`. Perintah aktivasi ini belum dijalankan.

Rollback hanya berkas yang tercatat; mapping, user ID, role, credential lama dan seluruh konten/skor pengguna tidak direvert. Lihat SSO_PHASE4_DEPLOYMENT.md untuk prasyarat dan pemulihan jika build/dependency gagal.

## Lamariva

Autentikasi awal: better-auth email/password/Google; pemulihan password dan role native.

Perubahan: Rute /auth/febro, sesi signed-cookie better-auth native, pengaitan eksplisit; implicit Google email linking ditolak; sanitize-html dipatch kompatibel.

Berkas native berubah/baru:

- `package-lock.json`
- `next.config.ts`
- `src/lib/febro-sso.ts`
- `src/lib/auth.ts`
- `src/app/auth/febro/[[...flow]]/route.ts`
- `src/app/api/febro-status/route.ts`
- `src/components/febro-login.tsx`
- `src/components/workspace.tsx`

Ditambah `15` berkas runtime server-only `sso/`; daftar lengkap dan checksum berada pada `phase4/releases/lamariva/manifest.json`. Tidak ada .env, database, upload atau signing secret dalam artefak.

Pengujian: login lokal sintetis/native, OIDC code/PKCE nyata terhadap OP fixture, konfirmasi pengaitan, pemilihan ID asli, isolasi kepemilikan, login/logout browser mobile 390px dan desktop 1366px. Rincian restart/expiry ada di laporan pengujian akhir.

Blocker: Provider pusat belum aktif; HTTPS/Google staging dan callback logging belum diterima.

Perintah pemeriksaan aman: `python3 phase4/scripts/release.py verify lamariva`. Dry-run migrasi: `node phase4/scripts/migrate.mjs lamariva --dry-run`.

Deployment setelah approval dan acceptance: `python3 phase4/scripts/release.py deploy lamariva /absolute/path/to/reviewed-lamariva-approval.json`. Rollback memerlukan approval terpisah operation=rollback: `python3 phase4/scripts/release.py rollback lamariva /absolute/path/to/reviewed-lamariva-rollback-approval.json`. Perintah aktivasi ini belum dijalankan.

Rollback hanya berkas yang tercatat; mapping, user ID, role, credential lama dan seluruh konten/skor pengguna tidak direvert. Lihat SSO_PHASE4_DEPLOYMENT.md untuk prasyarat dan pemulihan jika build/dependency gagal.

## Itinerary

Autentikasi awal: Legacy OIDC dan pengaitan password; login password sebelumnya dinonaktifkan.

Perubahan: Login password dipulihkan dengan CSRF/rate limit; rute baru /auth/space; callback legacy tetap; sesi Express diregenerasi; role native dipertahankan.

Berkas native berubah/baru:

- `views/auth/login.ejs`
- `src/server.js`
- `src/routes/auth.js`
- `src/services/febro-sso.js`

Ditambah `15` berkas runtime server-only `sso/`; daftar lengkap dan checksum berada pada `phase4/releases/itinerary/manifest.json`. Tidak ada .env, database, upload atau signing secret dalam artefak.

Pengujian: login lokal sintetis/native, OIDC code/PKCE nyata terhadap OP fixture, konfirmasi pengaitan, pemilihan ID asli, isolasi kepemilikan, login/logout browser mobile 390px dan desktop 1366px. Rincian restart/expiry ada di laporan pengujian akhir.

Blocker: Provider/HTTPS staging belum diterima; aktivasi ls-itinerary.service memerlukan operator systemd berwenang.

Perintah pemeriksaan aman: `python3 phase4/scripts/release.py verify itinerary`. Dry-run migrasi: `node phase4/scripts/migrate.mjs itinerary --dry-run`.

Deployment/rollback: ikuti manifest, npm ci dan npm run check di jendela yang disetujui; operator systemd menangani unit ls-itinerary.service. Runner produksi menolak aplikasi ini agar tidak mencoba operasi elevated atau menciptakan proses PM2 baru.

Rollback hanya berkas yang tercatat; mapping, user ID, role, credential lama dan seluruh konten/skor pengguna tidak direvert. Lihat SSO_PHASE4_DEPLOYMENT.md untuk prasyarat dan pemulihan jika build/dependency gagal.

## VoltLab

Autentikasi awal: Google dan password administrator; sesi hashed PostgreSQL.

Perubahan: Rute /api/auth/febro, sesi native, fresh proof, UI login/profil; Google email collision ditolak; Next.js dinaikkan ke 16.4.2.

Berkas native berubah/baru:

- `package.json`
- `package-lock.json`
- `server/febro-sso.ts`
- `app/login/page.tsx`
- `app/api/auth/google/callback/route.ts`
- `app/api/auth/febro-status/route.ts`
- `app/api/auth/febro/[[...flow]]/route.ts`
- `components/VoltLab.tsx`
- `components/FebroLink.tsx`

Ditambah `15` berkas runtime server-only `sso/`; daftar lengkap dan checksum berada pada `phase4/releases/voltlab/manifest.json`. Tidak ada .env, database, upload atau signing secret dalam artefak.

Pengujian: login lokal sintetis/native, OIDC code/PKCE nyata terhadap OP fixture, konfirmasi pengaitan, pemilihan ID asli, isolasi kepemilikan, login/logout browser mobile 390px dan desktop 1366px. Rincian restart/expiry ada di laporan pengujian akhir.

Blocker: Provider/HTTPS dan Google staging belum diterima; kebijakan callback logging perlu perubahan terpisah yang disetujui.

Perintah pemeriksaan aman: `python3 phase4/scripts/release.py verify voltlab`. Dry-run migrasi: `node phase4/scripts/migrate.mjs voltlab --dry-run`.

Deployment setelah approval dan acceptance: `python3 phase4/scripts/release.py deploy voltlab /absolute/path/to/reviewed-voltlab-approval.json`. Rollback memerlukan approval terpisah operation=rollback: `python3 phase4/scripts/release.py rollback voltlab /absolute/path/to/reviewed-voltlab-rollback-approval.json`. Perintah aktivasi ini belum dijalankan.

Rollback hanya berkas yang tercatat; mapping, user ID, role, credential lama dan seluruh konten/skor pengguna tidak direvert. Lihat SSO_PHASE4_DEPLOYMENT.md untuk prasyarat dan pemulihan jika build/dependency gagal.

## Files

Autentikasi awal: OIDC issuer legacy; sesi SQLite dan ownership accounts.sub.

Perubahan: Rute /auth/febro menggunakan discovery/PKCE/verifikasi pustaka, mapping terpisah ke sub asli, bukti sesi Files baru, konfirmasi dan regenerasi sesi.

Berkas native berubah/baru:

- `package-lock.json`
- `public/app.js`
- `src/febro-sso.mjs`
- `src/server.mjs`

Ditambah `15` berkas runtime server-only `sso/`; daftar lengkap dan checksum berada pada `phase4/releases/files/manifest.json`. Tidak ada .env, database, upload atau signing secret dalam artefak.

Pengujian: login lokal sintetis/native, OIDC code/PKCE nyata terhadap OP fixture, konfirmasi pengaitan, pemilihan ID asli, isolasi kepemilikan, login/logout browser mobile 390px dan desktop 1366px. Rincian restart/expiry ada di laporan pengujian akhir.

Blocker: Hanya kandidat terisolasi; dual ownership dan isolasi telah diuji sintetis, tetapi HTTPS staging dan persetujuan rollout masih wajib.

Perintah pemeriksaan aman: `python3 phase4/scripts/release.py verify files`. Dry-run migrasi: `node phase4/scripts/migrate.mjs files --dry-run`.

Deployment setelah approval dan acceptance: `python3 phase4/scripts/release.py deploy files /absolute/path/to/reviewed-files-approval.json`. Rollback memerlukan approval terpisah operation=rollback: `python3 phase4/scripts/release.py rollback files /absolute/path/to/reviewed-files-rollback-approval.json`. Perintah aktivasi ini belum dijalankan.

Rollback hanya berkas yang tercatat; mapping, user ID, role, credential lama dan seluruh konten/skor pengguna tidak direvert. Lihat SSO_PHASE4_DEPLOYMENT.md untuk prasyarat dan pemulihan jika build/dependency gagal.

## Play

Autentikasi awal: Guest fa_player dan leaderboard anonim; score anti-abuse native.

Perubahan: Login opsional, claim Guest eksplisit, sesi autentikasi terpisah delapan jam; endpoint skor memilih pemain di server; logout kembali ke Guest tanpa mengubah runs/bests.

Berkas native berubah/baru:

- `public/index.html`
- `public/assets/febro-account.js`
- `services/leaderboard/package-lock.json`
- `services/leaderboard/febro-sso.mjs`
- `services/leaderboard/server.mjs`

Ditambah `15` berkas runtime server-only `sso/`; daftar lengkap dan checksum berada pada `phase4/releases/play/manifest.json`. Tidak ada .env, database, upload atau signing secret dalam artefak.

Pengujian: login lokal sintetis/native, OIDC code/PKCE nyata terhadap OP fixture, konfirmasi pengaitan, pemilihan ID asli, isolasi kepemilikan, login/logout browser mobile 390px dan desktop 1366px. Rincian restart/expiry ada di laporan pengujian akhir.

Blocker: Provider/HTTPS staging belum diterima; registrasi/logout callback dan callback logging belum diotorisasi.

Perintah pemeriksaan aman: `python3 phase4/scripts/release.py verify play`. Dry-run migrasi: `node phase4/scripts/migrate.mjs play --dry-run`.

Deployment setelah approval dan acceptance: `python3 phase4/scripts/release.py deploy play /absolute/path/to/reviewed-play-approval.json`. Rollback memerlukan approval terpisah operation=rollback: `python3 phase4/scripts/release.py rollback play /absolute/path/to/reviewed-play-rollback-approval.json`. Perintah aktivasi ini belum dijalankan.

Rollback hanya berkas yang tercatat; mapping, user ID, role, credential lama dan seluruh konten/skor pengguna tidak direvert. Lihat SSO_PHASE4_DEPLOYMENT.md untuk prasyarat dan pemulihan jika build/dependency gagal.
