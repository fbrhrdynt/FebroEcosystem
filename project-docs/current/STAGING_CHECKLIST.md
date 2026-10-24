# Checklist HTTPS dan Google staging

Status **BLOCKED**. Tidak tersedia bukti endpoint HTTPS staging yang diotorisasi, sertifikat tepercaya, registrasi Google staging dan persetujuan callback. Tidak ada secret produksi disalin. Template `phase5/staging.example.json` sengaja kosong dan ditolak validator. `CONFIG_VALID_ONLY` bukan bukti endpoint hidup maupun login Google berhasil.

1. Operator menentukan enam origin HTTPS staging terpisah dari domain produksi; pusat harus memakai `eco.<BASE_DOMAIN staging>` dan issuer exact `https://eco.<BASE_DOMAIN staging>/profile`. Konfigurasikan `BASE_DOMAIN` konsisten. Jangan mengisi host rekaan dalam registrasi nyata.
2. Sediakan database sintetis PostgreSQL/SQLite, storage, port loopback yang belum digunakan, process definitions staging, serta akun uji terpisah. Itinerary tetap systemd di produksi; jangan menggandakan proses produksinya lewat PM2.
3. Buat signing key, cookie key, password SMTP dan lima client secret staging baru dalam direktori privat 0700, berkas 0600. Jangan gunakan key atau secret produksi. Generator Phase 4 default memakai callback produksi: **jangan gunakan hasil default itu untuk staging**. Registrasi staging harus dibuat eksplisit dari origin yang sudah disetujui. Client ID provider sesuai map `febro-<app>-v2`; secret berbeda setiap client dan lingkungan.
4. Set `FEBRO_DEPLOYMENT_ENV=staging`, `FEBRO_PROVIDER_ISSUER`, `FEBRO_PROVIDER_DATA_DIR`, `BASE_DOMAIN`, `NODE_ENV=production`; `FEBRO_SSO_TEST_ONLY` harus tidak aktif. Pisahkan APP_URL/PUBLIC_ORIGIN dan seluruh database/storage/Google credential dari produksi.
5. Untuk setiap origin staging daftarkan exact callback: Lamariva `/auth/febro/callback`; Itinerary `/auth/space/callback`; VoltLab `/api/auth/febro/callback`; Files `/auth/febro/callback`; Play `/api/leaderboard/auth/callback`. Post logout sama dengan base flow + `/logged-out`; khusus Play `/api/leaderboard/auth/febro/logged-out`. Jangan arahkan traffic staging ke callback produksi.
6. Registrasikan client Google staging nyata dan callback pusat staging `/profile/auth/google/callback` di Google Console. Gunakan credential terpisah; jangan memasukkan nilainya ke laporan atau template. Tinjau consent screen/test users, URI exact, nonce dan email_verified. Kehadiran env bukan bukti registrasi diterima Google.
7. Operator menyediakan TLS tepercaya dan vhost staging terpisah: proxy loopback, Host exact, X-Forwarded-Proto=https, X-Real-IP dari peer tepercaya; hanya port loopback aplikasi. Terapkan rate limit ingress terpisah. Template HTTPS baru ada di `phase5/staging/https.conf.template`; seluruh placeholder harus diisi dan diuji di lingkungan staging terpisah. Review juga snippet `phase5/nginx/*.conf.review` sebagai referensi sanitasi, bukan konfigurasi siap dipasang. Jangan menyalin hostname produksi ke staging.
8. Nonaktifkan query logging pada callback baru, callback Google dan legacy, juga error log/debug yang dapat memuat code/state. Buktikan dengan canary sintetis; jangan gunakan token nyata. Terapkan retensi audit privat 30 hari dan rotasi ukuran oleh operator. Limiter proses tunggal perlu shared/ingress limit bila scaled.
9. Isi template metadata tanpa secret, jalankan `node phase5/scripts/validate-staging.mjs /absolute/path/staging.json`. Validator menolak produksi, HTTP, URI drift, wildcard dan gate Google yang belum diterima; validator tidak memanggil Google atau menguji TLS.
10. Jalankan browser satu rangkaian login pusat nyata → native session di lima RP, email/Google nyata, link dua bukti/konfirmasi, collision rejection, ownership/permission, logout, session expiry/restart, Secure/HttpOnly/SameSite=Lax cookies pada HTTPS. Ulangi viewport 375, 430, 768, 1024, 1440.
11. Catat acceptance yang bisa direview sebelum permintaan aktivasi produksi terpisah. Tidak ada reload Nginx, DNS, SSL, credential live, migrasi atau restart produksi dalam Phase 5 ini.

## Referensi callback produksi, tidak diaktifkan

| Aplikasi | URI exact |
|---|---|
| Lamariva | https://cv.febro.id/auth/febro/callback |
| Itinerary | https://itinerary.febro.id/auth/space/callback |
| VoltLab | https://voltlab.febro.id/api/auth/febro/callback |
| Files | https://files.febro.id/auth/febro/callback |
| Play | https://play.febro.id/api/leaderboard/auth/callback |

URI dibandingkan dengan implementasi route dan laporan Phase 4. Status pendaftaran pada provider live belum diverifikasi; tidak ada izin akses/ubah Console Google yang tersedia.
