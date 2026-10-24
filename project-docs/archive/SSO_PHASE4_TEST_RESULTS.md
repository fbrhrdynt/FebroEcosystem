# Hasil pengujian Phase 4

Hasil akhir: **22 tes Phase 4 lulus, 0 gagal, 0 skipped oleh runner**. Tambahan **58 tes regresi lulus, 0 gagal**. Total 80 tes otomatis lulus. Harness API VoltLab terisolasi juga lulus. Dua belas command pemeriksaan sintaks/tipe/regresi lulus; build akhir Lamariva dan VoltLab lulus. Tidak menganggap pemeriksaan yang belum dijalankan sebagai lulus.

Bukti utama: phase4/evidence/test-phase4-final.log, phase4-test-summary.json, final-validation.json, regression-summary.json, build-summary.json dan build-*-final.log. Percobaan awal yang gagal diperbaiki dan dijalankan ulang; hasil di atas menggunakan eksekusi akhir, bukan hasil perkiraan.

| Skenario | Hasil yang benar-benar diuji |
|---|---|
| Discovery/JWKS/path issuer | Lulus; metadata issuer /profile, public JWKS tanpa private d; Google/handoff legacy tidak tertangkap mount baru |
| Code flow/PKCE | Lulus; S256 wajib, redirect asing ditolak, verifier salah ditolak, replay code ditolak |
| State/nonce/callback | Lulus; browser/session berbeda, replay callback, nonce harapan salah dan callback tidak sesuai ditolak |
| Signature/issuer/audience | RP memakai verifikasi pustaka dan non-repudiation checks; exchange nyata menghasilkan identitas terverifikasi, bukan decode-only |
| Refresh/revocation | Lulus; refresh token berbeda setiap pemakaian, reuse family ditolak, access token revoked ditolak UserInfo |
| Persistensi provider/key | Lulus; config key privat, init tidak overwrite, rotasi overlap; database provider ditutup/dibuka kembali sebelum refresh berhasil |
| Fresh central login/consent | Lulus; cookie lama tidak memenuhi prompt login; sesi baru diterima, CSRF/exact Origin dan account consistency diuji |
| Account mapping | Lulus di SQLite dan PostgreSQL; issuer+sub saja, ID lokal asli, unique conflicts/FK/status; tidak membuat duplikasi akun |
| Files | Native endpoint setelah SSO mengizinkan folder pemilik asli dan menolak user lain 404; quota/share/download juga diuji regresi |
| Itinerary | Native password fallback lulus; trip asli dapat dibuka pemilik, user lain ditolak; role Administrator/User tidak diimpor dari OIDC |
| Lamariva | Native password login/signed better-auth cookie lulus; Document asli dapat diakses pemilik dan ditolak untuk user lain termasuk versions |
| VoltLab | Native session dan workspace pemilik dipertahankan; user lain tidak melihat workspace, endpoint admin menolak user biasa; harness API menguji block/revoke/CSRF/revision |
| Play Guest | Guest start/finish/save tetap bekerja tanpa SSO, score bounds, expired rounds dan replay ditolak |
| Play authenticated scores | Pemain dipilih dari sesi server; player_id kiriman browser diabaikan; skor baru terkait pemain asli, skor historis tetap ada |
| UI mobile/desktop | Lima aplikasi lulus login dan logout browser Chromium pada 390×844 dan 1366×900; halaman SSO tanpa horizontal overflow; 10 screenshot tersimpan |
| Logout | Native sesi aplikasi dicabut; RP-initiated logout dengan state, provider confirmation dan exact registered return diuji browser; Play kembali Guest |
| Expiry | Flow/intent/model provider expired ditolak; sesi native kelima aplikasi dipaksa expired hanya pada DB sintetis dan akses ditolak/kembali Guest |
| Restart aplikasi | Kelima proses aplikasi staging benar-benar dihentikan/dijalankan ulang dengan DB/secret fixture yang sama; sesi, mapping dan pemilik asli tetap dikenali |
| Migrasi/rollback gate | Migrasi additive diulang pada schema native, constraint dan konten asli fixture dipertahankan; permintaan deploy tanpa approval ditolak sebelum mutasi |
| Backup | SQLite integrity/FK lulus; tiga restore PostgreSQL terisolasi lulus; lima objek vault/dokumen snapshot cocok checksum |
| Produksi akhir | Enam HTTP loopback dan enam HTTPS publik lama 200; PID tetap dan nol source checksum drift |

Semua tes akun/konten menggunakan user sintetis di database terisolasi. Tidak ada tes merusak terhadap akun produksi. Restore validasi backup produksi dilakukan terpisah, tanpa menjalankan skenario autentikasi terhadap record pengguna asli.

Belum dijalankan/tidak dinyatakan lulus: stack baru melalui endpoint HTTPS staging publik tepercaya; login Google dengan client/callback staging yang benar-benar disetujui; pengiriman/verifikasi email SMTP nyata; pemeriksaan browser menyeluruh seluruh navigasi bisnis; aktivasi/rollback proses produksi. Endpoint HTTPS produksi lama yang sehat bukan acceptance integrasi baru. Tes HTTP lokal sengaja menggunakan test-only mode; test-only mode ditolak saat NODE_ENV=production.

Pengujian khusus aplikasi menggunakan OP fixture yang menerbitkan identitas sintetis. Kode mount/interaksi sesi pusat diuji terpisah, termasuk fresh-session proof. Karena itu hasil ini tidak mengklaim satu browser telah menyelesaikan seluruh stack produksi Google+HTTPS baru.

Untuk mengulang secara aman:

```sh
cd /opt/febro-ecosystem
node --test phase4/tests/*.test.mjs
python3 phase4/scripts/check-all.py
```

Jangan menjalankan build Next dan proses dev/test Next untuk aplikasi staging yang sama secara bersamaan karena keduanya memakai .next. Build akhir pada laporan ini diselesaikan setelah proses pengujian aplikasi berhenti. Beberapa percobaan awal dibatalkan/gagal saat pengembangan; tidak dihitung sebagai penerimaan akhir.
