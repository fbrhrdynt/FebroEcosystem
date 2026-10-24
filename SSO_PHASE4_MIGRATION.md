# Strategi migrasi aman

Tidak ada migrasi database produksi yang dijalankan. Semua SQL bersifat additive, idempotent, memakai foreign key bertipe asli, serta constraint unik `(issuer,subject)` dan `(issuer,local_id)`. Tidak ada backfill email, reset password, penghapusan credential lama, perubahan role, atau pemindahan kepemilikan.

Tabel baru: febro_identities, febro_sso_state, febro_sso_audit; khusus Play juga febro_play_sessions. State, verifier dan proof disimpan server-side, dibatasi waktu dan dikonsumsi sekali. Kunci bearer state di database di-hash; verifier tetap diperlukan server untuk penukaran PKCE dan dilindungi akses database. Event audit memakai nama tetap tanpa token/secret dan dibersihkan sesudah 30 hari ketika alur baru dibuat.

Pengaitan: login lokal terlebih dahulu; pilih Hubungkan Febro Space; buktikan password lokal atau sesi native baru (Google/legacy Files); lakukan autentikasi pusat baru; konfirmasi kedua identitas. Bukti lokal terikat sesi yang sama dan berumur paling lama lima menit. Subject berasal dari ID token yang diverifikasi, bukan dari email/form. Konflik identitas gagal tanpa perubahan pemilik atau duplikasi akun. Pemeriksaan status lokal dan insert mapping ada dalam transaksi database aplikasi yang sama. Sesi lokal diganti setelah keberhasilan.

Files hanya mengaitkan ke accounts.sub yang sudah ada dan terbukti dimiliki pemegang sesi Files baru. Legacy login tetap diperlukan untuk bootstrap. nodes.owner_sub, quota, share_links, user_shares dan storage_key tidak diperbarui. Play membuktikan Guest melalui cookie HttpOnly pemain saat ini, memerlukan autentikasi pusat baru dan konfirmasi; skor/runs/bests tidak digabung. Login ke identitas yang sudah terkait memilih pemain aslinya, sedangkan riwayat Guest lain tetap tersimpan.

Lamariva dan VoltLab menolak implicit Google linking berdasarkan email pada kandidat rilis. Google account yang sudah terhubung tetap bisa dipakai. User Google-only dapat masuk kembali melalui metode Google lama untuk memperoleh sesi baru sebelum mengaitkan Febro Space. Login/password reset Lamariva tidak dihapus. Itinerary memulihkan password login dengan CSRF, rate limit dan regenerasi sesi; callback OIDC lama tidak diganti.

Dry-run, dari /opt/febro-ecosystem:

```sh
node phase4/scripts/migrate.mjs lamariva --dry-run
node phase4/scripts/migrate.mjs itinerary --dry-run
node phase4/scripts/migrate.mjs voltlab --dry-run
node phase4/scripts/migrate.mjs files --dry-run
node phase4/scripts/migrate.mjs play --dry-run
```

Apply fixture hanya tersedia dengan --apply-staging, FEBRO_MIGRATION_TARGET=isolated-staging dan database /tmp/febro-phase4-* atau PostgreSQL lokal febro_phase4_test_*. Jalur produksi tidak diterima oleh skrip staging. Jalur apply produksi terpisah di sso/migrate-approved.mjs memerlukan file persetujuan deployment, backup terverifikasi dan gate penerimaan HTTPS pada runner rilis.

Rollback kode meninggalkan tabel tambahan dan seluruh link baru tetap ada. Jangan DROP tabel mapping yang sudah dipakai; jangan restore database lama untuk rollback rutin. Validasi ulang jumlah akun, foreign key, role dan kunci pemilik sebelum serta setelah aktivasi yang disetujui. Bukti pengujian menggunakan schema native dan konten sintetis ada pada tests/native-postgres.test.mjs, native-sqlite.test.mjs dan repository.test.mjs.
