# Hasil pengujian Phase 5

Eksekusi akhir: **98 PASS, 0 FAIL, 0 SKIPPED runner**. Aktivitas acceptance terpisah: **8 SKIPPED**, bukan dihitung lulus. Tidak menjumlahkan ulang rerun sebagai tes baru.

| Suite/bukti | PASS | FAIL | SKIPPED runner |
|---|---:|---:|---:|
| test-phase5-acceptance.log | 28 | 0 | 0 |
| test-phase2-regression.log | 12 | 0 | 0 |
| final-central-regression.log | 10 | 0 | 0 |
| final-files-regression.log | 10 | 0 | 0 |
| final-itinerary-regression.log | 5 | 0 | 0 |
| final-lamariva-regression.log | 5 | 0 | 0 |
| final-voltlab-regression.log | 28 | 0 | 0 |

Suite Phase 5 memuat 22 tes integrasi/regresi turunan Phase 4 dan 6 tes hardening/kompatibilitas baru. Phase 2 dijalankan terpisah (12 tes). Regresi native lima aplikasi berjumlah 58 tes, termasuk dua proses TAP VoltLab (21 engine + 7 keamanan). Harness API VoltLab merupakan command tambahan, tidak dihitung sebagai tes TAP baru. Dua belas command check-all final exit 0; hasil di final-validation.json. Dua build Next ada di build-final-summary.json; aplikasi Node tidak mempunyai production bundle script, sehingga check/syntax dipakai untuk entrypoint-nya (N/A bundling).

Cakupan nyata: code/PKCE, state/nonce/replay/CSRF, exact redirect, issuer/audience/signature/expiry, refresh rotation/reuse/revocation, native login/logout, fresh dual proof, collision rejection, issuer+subject mapping, local ID, cross-user permission/ownership, guest Play/skor historis, session expiry dan restart recovery. Provider key/session persistensi dan rotasi overlap diuji dengan material sintetis, tanpa mengganti key live. Tes SMTP memanggil sendMail aplikasi ke server SMTP loopback berautentikasi; tes Google memakai signature RSA dan cert fixture, bukan jaringan Google.

Browser Chromium benar-benar berjalan pada 375, 430, 768, 1024, 1440px untuk Lamariva, Itinerary, VoltLab, Files, Play. Login, identitas native, no-horizontal-overflow halaman SSO dan logout diuji, 25 screenshot di evidence/screenshots. UI pusat/protokol diuji oleh host/provider fixture; tidak mengklaim browser stack produksi baru atau seluruh navigasi bisnis.

Verifikasi pendukung: semua checksum backup Phase 4 cocok; SQLite central/files/play integrity ok dan nol FK violations; tiga pg_restore pada cluster baru unix-socket-only lulus dan nol FK invalid; lima referenced assets cocok checksum. Rehearsal rollback source-only sintetis mempertahankan hash user/ownership dan skor. Release membership dan tiap SHA256 source dicek; hasil release-verification.json. Pemeriksaan health produksi lama HTTP/HTTPS bukan acceptance integrasi baru.

| Aktivitas | Status | Alasan |
|---|---|---|
| Regresi Phase 3 khusus | SKIPPED | Dokumen/deployment dan runner khusus Phase 3 tidak ditemukan; regresi native dan Phase 2 dijalankan tanpa mengganti label sebagai Phase 3. |
| HTTPS end-to-end stack baru | SKIPPED | Endpoint staging dan sertifikat terotorisasi belum tersedia. |
| Login Google nyata | SKIPPED | Client/secret dan persetujuan callback staging terpisah belum tersedia; tes Google sintetis bukan bukti login Google nyata. |
| SMTP eksternal nyata | SKIPPED | Credential SMTP staging terpisah belum tersedia; SMTP loopback sintetis sudah diuji. |
| Semua navigasi bisnis dalam browser | SKIPPED | Browser terbatas halaman SSO/login/logout, bukan seluruh layar CV/trip/project/sharing/game. |
| Deploy/restart/migrasi produksi | SKIPPED | Dilarang oleh ruang lingkup tugas. |
| Rollback proses produksi | SKIPPED | Dilarang; rehearsal source-only sintetis dan verifikasi backup tersedia. |
| Acceptance logging ingress dan retensi operasional | SKIPPED | Template disiapkan, belum dipasang/reload; canary ingress HTTPS dan rotasi audit operasional belum diterima. |

Percobaan awal: test-integrations.log mencatat timeout logout Lamariva; test-postgres-rerun.log mencatat tiga error cwd; test-phase5-final.log mencatat readiness VoltLab saat dependency isolation berlangsung. Harness import Google awal juga dikoreksi. Timeout navigasi browser dinaikkan untuk kompilasi Next terisolasi; dependency diselesaikan sebelum eksekusi acceptance akhir. Hasil akhir memakai test-phase5-acceptance.log; hasil percobaan awal tidak dinyatakan lulus.

Command reproduksi aman dari /opt/febro-ecosystem: `node --test phase5/tests/*.test.mjs`, `node --test sso-phase2/tests/*.test.mjs`, `python3 phase5/scripts/check-all.py`. Jangan build aplikasi Next pada .next yang sedang digunakan suite native. Restore backup hanya di lingkungan privat baru, bukan database live.
