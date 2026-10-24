# Deployment Phase 4 — belum diotorisasi

Semua implementasi ada di /opt/febro-ecosystem/phase4/apps. Tidak ada PM2 restart, systemd restart, Nginx reload, perubahan DNS/SSL, perubahan credential OAuth produksi atau penonaktifan login lama selama pekerjaan ini.

Urutan aktivasi: provider pusat setelah perbaikan dependensi dan penerimaan HTTPS staging, kemudian satu aplikasi setiap kali: Lamariva, Itinerary, VoltLab, Files, Play. Endpoint HTTPS publik lama sehat; ini tidak menggantikan acceptance kandidat baru. Jangan mengaktifkan toggle hanya karena pengujian HTTP sintetis lulus.

Prasyarat yang belum terpenuhi:

- Endpoint HTTPS staging yang memang diotorisasi, callback exact dan registrasi lima client terpisah beserta post-logout URI. Aplikasi meminta openid/email/profile; offline_access tidak diminta aplikasi secara default. Rotasi refresh token diuji pada provider terpisah.
- Konfigurasi signing JWK, cookie keys dan database provider privat/persisten. Generator tidak menciptakan credential Google dan belum dijalankan pada data produksi. Untuk deployment staging, factory mendukung deployment=staging dengan issuer HTTPS /profile; host pusat harus sesuai BASE_DOMAIN. Gunakan data dan credential staging terpisah.
- Uji login email/Google nyata di staging. Keberadaan variabel Google bukan bukti persetujuan callback oleh Google.
- Perbaikan nodemailer/gaxios/uuid pusat yang memerlukan kajian kompatibilitas; runner menolak aktivasi bila audit target masih high/critical.
- Kebijakan callback logging pada vhost terkait. Snippet review ada di phase4/nginx/*.conf.review; tidak dipasang. Callback baru, Google, dan callback legacy harus disanitasi dari access/error logs. Penyesuaian dan reload Nginx memerlukan persetujuan terpisah.
- Itinerary dikelola systemd ls-itinerary.service. Runner otomatis menolak Itinerary; operator systemd berwenang diperlukan. Jangan membuat duplikat proses PM2.

Callback produksi baru yang harus didaftarkan persis:

| Aplikasi | Callback | Post-logout |
|---|---|---|
| Lamariva | https://cv.febro.id/auth/febro/callback | https://cv.febro.id/auth/febro/logged-out |
| Itinerary | https://itinerary.febro.id/auth/space/callback | https://itinerary.febro.id/auth/space/logged-out |
| VoltLab | https://voltlab.febro.id/api/auth/febro/callback | https://voltlab.febro.id/api/auth/febro/logged-out |
| Files | https://files.febro.id/auth/febro/callback | https://files.febro.id/auth/febro/logged-out |
| Play | https://play.febro.id/api/leaderboard/auth/callback | https://play.febro.id/api/leaderboard/auth/febro/logged-out |

Itinerary memakai /auth/space/callback agar /auth/febro/callback lama tetap berfungsi. Jangan memakai URI yang direncanakan dokumen awal tanpa menyesuaikan registrasi ini.

Periksa artefak tanpa aktivasi:

```sh
cd /opt/febro-ecosystem
python3 phase4/scripts/release.py verify central
python3 phase4/scripts/release.py verify lamariva
python3 phase4/scripts/release.py verify itinerary
python3 phase4/scripts/release.py verify voltlab
python3 phase4/scripts/release.py verify files
python3 phase4/scripts/release.py verify play
```

Runner release.py prepare menghasilkan source.tar.gz dan manifest hanya untuk berkas berubah/baru. Ia mengecualikan .env, database, uploads, vault, node_modules dan .next. Verify memeriksa checksum artefak, seluruh arsip/database backup, hasil restore dan konsistensi assets.

**Jangan jalankan perintah berikut sekarang.** Setelah acceptance HTTPS dan persetujuan eksplisit aplikasi tertentu, operator menyediakan approval JSON privat dengan app, operation=deploy, artifact_sha256 yang cocok manifest, approved_by, approved_at UTC kurang dari 24 jam, serta https_acceptance=true. Tidak ada approval JSON yang dibuat oleh agen. Credential/toggle produksi harus disiapkan operator melalui prosedur tersendiri; skrip tidak menulis .env.

```sh
python3 /opt/febro-ecosystem/phase4/scripts/release.py deploy files /absolute/path/to/reviewed-files-approval.json
```

Perintah tersebut merupakan aktivasi produksi: setelah gate, ia memeriksa drift dan HTTPS health, mengambil backup tambahan berkas yang berubah, memakai lock agar satu aplikasi saja, menghentikan target PM2, memasang dependency independen, memeriksa/build, menjalankan migrasi additive, mengaktifkan target PM2 dan memeriksa health. Jangan memberi approval sampai acceptance nyata lengkap. Pemasangan/build tidak menjalankan lifecycle script npm; build Next/Prisma dijalankan eksplisit.

Jika gagal, runner berhenti dan mengembalikan sumber berubah saja. Perbaiki dependency/build dari lockfile semula sebelum operator menjalankan pemulihan layanan; kegagalan pasca-restart dapat meninggalkan proses perlu dihentikan/dipulihkan operator. Tidak ada restore database otomatis. Receipt dan deployment-before.tar.gz tidak boleh ditimpa.

Rollback yang disetujui memakai approval baru operation=rollback dengan hash artefak sama:

```sh
python3 /opt/febro-ecosystem/phase4/scripts/release.py rollback files /absolute/path/to/reviewed-files-rollback-approval.json
```

Rollback tidak mengembalikan .env, database, vault, uploads atau skor. Akun/link baru tetap dipertahankan. Untuk Itinerary, operator yang diotorisasi mengembalikan hanya berkas pada manifest, mempertahankan tabel tambahan, memasang dependency lockfile yang sesuai, menjalankan npm run check, kemudian mengelola ls-itinerary.service secara terpisah dan memeriksa /health.

Policy sesi: logout lokal mencabut sesi aplikasi ini dan bekerja tanpa IdP. Pilihan Keluar aplikasi dan Febro Space mencabut sesi lokal dahulu, lalu menjalankan RP-initiated logout dengan state dan konfirmasi provider. Sesi aplikasi lain berakhir sesuai masa berlaku native (umumnya tujuh hari, Itinerary 14 hari; sesi Play terautentikasi delapan jam). Tidak ada klaim global backchannel logout/instant revocation lintas aplikasi. Status/role lokal tetap otoritatif. Risiko keterlambatan revokasi sesi aplikasi lain harus diterima dalam acceptance atau ditangani dalam pekerjaan backchannel berikutnya.
