# Manifest backup Phase 4

Lokasi backup tercatat pada `phase4/evidence/backup-path`; indeks checksum, ukuran dan izin berada di `phase4/evidence/backup-integrity.json`. Direktori backup mode 0700 dan berkas sensitif mode 0600. Tidak ada backup lama ditimpa. Salinan aplikasi tanpa .env/data produksi berada di `phase4/apps`.

Sebelum implementasi: arsip sumber per aplikasi dibuat, termasuk .env asli di arsip privat; konfigurasi Nginx terkait dan PM2 dipertahankan; SQLite pusat, Files dan Play disalin melalui **online backup API**, bukan menyalin file WAL hidup. Semua backup SQLite lolos integrity_check dan foreign_key_check dengan nol pelanggaran. PostgreSQL ketiga aplikasi dicadangkan memakai pg_dump custom-format tanpa menaruh password pada argumen command line.

Arsip sumber diperiksa jumlah anggotanya dan SHA-256. Ketiga dump PostgreSQL berhasil dipulihkan dengan pg_restore --exit-on-error ke cluster PostgreSQL 16 terisolasi yang hanya menerima unix socket privat. Nol foreign key yang belum tervalidasi. Cluster pemulihan sudah dihentikan; bukan database produksi dan tidak dipakai sebagai fixture pengujian akun.

Vault Files dan dokumen privat pusat dicadangkan terpisah. Verifikasi terhadap referensi database snapshot menemukan tiga objek Files dan dua dokumen pusat; seluruh objek ada dan checksum cocok. Bukti: `phase4/evidence/assets-verification.json`. Arsip mempertahankan metadata kepemilikan/izin. Laporan tidak memuat nama berkas pengguna atau isi dokumennya.

Unit systemd Itinerary /etc/systemd/system/ls-itinerary.service ditemukan kemudian dan dicadangkan sebagai berkas tambahan baru, tanpa menimpa arsip awal. Bukti/checksum: `phase4/evidence/itinerary-service.json`.

Backup dilindungi izin filesystem; enkripsi storage eksternal dan kebijakan retensi belum dibuktikan. Jangan menyalin arsip ini ke web root atau membagikan isinya. Jangan memulihkan seluruh database untuk rollback kode: tindakan itu dapat menghapus perubahan pengguna setelah deployment.

Pemulihan kode yang disetujui hanya mengembalikan berkas pada manifest rilis. Mapping identitas tambahan dan semua data pengguna tetap ada. Pemulihan bencana database harus dilakukan ke instance terpisah dahulu, divalidasi, lalu mendapat persetujuan tersendiri.
