# Persiapan deployment dan rollback Phase 5

**REVIEW ONLY — belum deploy.** Tidak ada restart layanan produksi, reload Nginx, DNS/SSL, credential OAuth live, migrasi produksi atau penghapusan login lama. Artefak Phase 4 tidak ditimpa.

## Pemeriksaan aman

Dari /opt/febro-ecosystem: `python3 phase5/scripts/review-release.py verify central` dan ganti app dengan lamariva, itinerary, voltlab, files, play. Program hanya menyediakan prepare/verify; tidak menyediakan operasi deploy. Periksa juga `sha256sum -c SHA256SUMS` di direktori release. Manifest memuat source hash dan checksum sebelum perubahan dari baseline Phase 4. `source.tar.gz` berisi delta; `candidate-source.tar.gz` berisi snapshot source kandidat lengkap dengan source-manifest.json. Keduanya tidak mengandung env, key, DB, upload, node_modules atau .next.

Jangan mengeksekusi runner `phase4/scripts/release.py` terhadap artefak baru: runner itu menargetkan source/manifests Phase 4 dan tetap utuh. Script lain yang disalin ke phase5/scripts dengan jalur warisan adalah referensi, bukan command deployment Phase 5. Tidak ada approval JSON dibuat.

## Reproduksi kandidat terisolasi

1. Review source/manifest dan checksum; extract candidate-source.tar.gz hanya setelah verifikasi path member, ke direktori staging baru tanpa source/data produksi. Gunakan filesystem terpisah dan database sintetis, jangan mengekstrak di /opt aplikasi live.
2. `npm ci --ignore-scripts` pada root kandidat yang memiliki lockfile dan `npm ci --ignore-scripts --omit=dev` pada setiap sso/. Files/Play root tanpa dependency aplikasi hanya perlu sso/. Play package aplikasi ada di services/leaderboard. Jangan npm install melalui symlink node_modules development. Audit `npm audit --omit=dev`; jangan memakai audit fix --force.
3. Untuk Lamariva jalankan Prisma generate dan npm run build secara eksplisit; generate tidak menerapkan migrasi. VoltLab npm run build. Node apps menggunakan npm run check; tidak memiliki bundling build script.
4. Siapkan native schema hanya di DB sintetis/staging yang disetujui; migrasi mapping additive dari runtime/repository.mjs harus direview dan diuji dua kali, tanpa email backfill. Native tests sudah melakukan fixture migration/idempotence. Jangan mengarahkan runner migrasi legacy ke DB produksi.
5. Ikuti STAGING_CHECKLIST.md: endpoint, BASE_DOMAIN/issuer, lima registrasi, Google/SMTP dan data/secret terpisah; template HTTPS belum siap install sampai placeholder diganti dan divalidasi operator. Logging callback harus aman sebelum traffic nyata.
6. Jalankan pengujian terisolasi dari workspace root dan rangkaian HTTPS/Google nyata; jangan build Next bersamaan dengan server test yang memakai .next sama. Catat acceptance independen, jangan menyamakan fixture dengan sertifikasi stack.

## Aktivasi produksi di luar pelaksanaan ini

Dibutuhkan review/approval baru per aplikasi, backup baru serta verifikasi restore/checksum, penerimaan sesi/logout, secret dan callback production exact, audit/build/regression terbaru, rollback dependency/build yang direview, drift check serta operator berwenang. Urutan provider dahulu lalu Lamariva, Itinerary, VoltLab, Files, Play satu per satu. Itinerary tetap ls-itinerary.service oleh operator systemd; tidak PM2 duplikat. Tidak ada command aktivasi otomatis Phase 5.

## Rollback yang aman

Sebelum perubahan yang kelak disetujui, simpan source changed-file, package/lockfile, dependency/build dan manifest checksum terbaru secara privat. Bila perlu rollback, operator mengembalikan hanya source yang berubah beserta lockfile/dependency/build yang sesuai, menghentikan proses hanya di jendela yang disetujui, memeriksa syntax/build lalu memulihkan proses lewat pengelola aslinya dan memeriksa health/auth/data.

Jangan restore DB lama untuk rollback rutin. Biarkan mapping/link baru, akun, ID lokal, role, ownership, trip/collaborator, dokumen/project, file/share, runs/bests/skor dan uploads tetap ada. Jangan menonaktifkan legacy login. Signing key lama harus tetap tersedia selama masa berlaku token plus skew; key produksi tidak diganti dalam Phase 5.

Rehearsal `python3 phase5/scripts/isolated-rollback.py` memulihkan source fixture sambil memeriksa hash data/leaderboard sintetis. Ini bukan eksekusi runner produksi atau bukti pemulihan layanan produksi. Backup Phase 4 diverifikasi/restore privat; backup tersebut historis, bukan pengganti backup saat cutover.
