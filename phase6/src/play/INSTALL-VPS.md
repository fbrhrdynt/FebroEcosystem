# Migrasi Febro Arcade ke /opt/play — v1.5

> Dibuat untuk VPS Ubuntu pengguna yang sudah memiliki `play.febro.id` melalui Nginx Certbot, PM2 `febro-arcade-api` dan optional `tribeworld-save`. **Tidak mengubah vhost lain.**

## A. Sebelum mulai

1. Upload `febro-arcade-unified-v1.5.zip` lewat WinSCP ke `/home/ubuntu/`.
2. Backup minimal dua file konfigurasi dan backend yang sudah ada. Script juga otomatis membuat backup di `/opt/play/backups/migration-YYYYMMDD-HHMMSS`.
3. **Jangan** hapus `/opt/play-api` atau `/opt/tribeworld-api` secara manual. Script memigrasikan databasenya dengan SQLite Backup API.
4. Walaupun Nginx lama saat ini gagal `nginx -t` karena `location` pada baris 66 berada di luar blok HTTPS, migration script memasang vhost yang utuh dan valid.

```bash
cd /home/ubuntu
sudo apt-get install -y unzip
unzip -o febro-arcade-unified-v1.5.zip

# Preview read-only, belum ada perubahan
sudo python3 /home/ubuntu/febro-arcade-unified-v1.5/scripts/migrate.py
```

Periksa output terutama daftar `Frontend`, `API`, `DB` dan root baru. Jika cocok, lanjut.

## B. Migrasi (perlu hentikan penulisan database sementara)

```bash
# Jangan stop layanan PM2 lain di server!
pm2 stop febro-arcade-api
# Jika layanan ini memang terpasang; abaikan "not found" jika belum ada:
pm2 stop tribeworld-save || true

# Buat tree /opt/play/public, /opt/play/services, /opt/play/storage.
# Script mengambil konten website LIVE terlebih dahulu, agar fitur yang sudah
# terpasang tidak ditimpa oleh arsip lama. DB disalin konsisten dari DB lama.
# Nginx conf play.febro.id diganti dengan config valid + kedua reverse proxy.
sudo python3 /home/ubuntu/febro-arcade-unified-v1.5/scripts/migrate.py --apply
```

Jika sukses, script mencetak `MIGRASI FILE SUKSES` dan lokasi backup. **Jika gagal**, jangan hapus file lama. Baca pesan error dan koreksi sebelum melanjutkan.

## C. Aktifkan API di lokasi baru

```bash
# Jangan pakai pm2 restart config lama: PM2 dapat tetap menyimpan path /opt/*-api.
pm2 delete febro-arcade-api || true
pm2 delete tribeworld-save || true

node -v
node --check /opt/play/services/leaderboard/server.mjs
node --check /opt/play/services/tribeworld/server.mjs

pm2 start /opt/play/services/leaderboard/pm2.config.cjs
pm2 start /opt/play/services/tribeworld/ecosystem.config.cjs
pm2 save
pm2 status
```

Database dan data pemain disimpan di:
- `/opt/play/storage/leaderboard/arcade.sqlite`
- `/opt/play/storage/tribeworld/tribeworld.sqlite`

Bila TribeWorld belum pernah digunakan login/cloud save, databasenya akan dibuat baru ketika backend pertama aktif.

## D. Tes

```bash
sudo nginx -t
curl -i http://127.0.0.1:3488/api/leaderboard/health
curl -i http://127.0.0.1:3491/api/tribeworld/health
curl -i https://play.febro.id/api/leaderboard/health
curl -i https://play.febro.id/api/tribeworld/health
curl -I https://play.febro.id/
curl -I https://play.febro.id/tribeworld/
curl -I https://play.febro.id/GhaffiLand/

# Negative checks: file privat tidak boleh dapat diakses melalui HTTP.
curl -i https://play.febro.id/storage/tribeworld/tribeworld.sqlite
curl -i https://play.febro.id/services/tribeworld/server.mjs
```

Expected: kedua endpoint API mengembalikan `200` + JSON, halaman game `200`, kedua URL privat `404`. Jika API masih `502`, cek `pm2 logs febro-arcade-api --lines 50 --nostream` dan `pm2 logs tribeworld-save --lines 50 --nostream`.

## E. GitHub satu repo

```bash
cd /opt/play
# Periksa apa yang akan di-track, terutama jangan sampai mencakup storage:
git init
git status --short
git add .
git status --short
# Periksa .env atau .sqlite tidak ikut stage:
git ls-files | grep -E '(^storage/|^backups/|\.sqlite|\.env)' && echo 'STOP: ada file privat!' || echo 'OK: private data tidak ikut Git'
git commit -m 'Initial Febro Arcade monorepo'
git branch -M main
# Setelah membuat repo kosong baru di GitHub:
git remote add origin https://github.com/USERNAME/REPOSITORY.git
git push -u origin main
```

**Jangan push** file database, password, cookie, hasil backup, atau folder `.env`. Gunakan GitHub repo **private** jika belum meninjau semua gambar / aset dari sisi privasi dan lisensi.

## F. Backup database (file privat, bukan Git)

```bash
# Backup konsisten database aktif menggunakan skrip bawaan TribeWorld
cd /opt/play
python3 scripts/backup-databases.py
# Akan membackup leaderboard dan TribeWorld, konsisten walau server sedang aktif.
```

Untuk pemulihan penuh, salinan lama ada di `/opt/play/backups/migration-*/legacy-backends/` dan `legacy-public-root/`, termasuk Nginx lama (`nginx-before.conf`). **Perhatikan:** Nginx lama memiliki kesalahan sintaks sebelum migrasi, jadi jangan restore file itu tanpa terlebih dahulu memperbaiki blok `location` yang salah.

## Catatan

- `/opt/play/public` adalah satu-satunya folder yang di-serve ke internet. Folder `services`, `storage`, `source`, dan `backups` **tidak** diekspos.
- Identitas pemain leaderboard menggunakan cookie domain `play.febro.id`, sedangkan cloud save TribeWorld menggunakan cookie login, sehingga URL dan identitas tidak berubah.
- GhaffiLand dipertahankan menggunakan YouTube; *tidak* diganti ke versi video MP4 orisinal yang ditolak.
- Tidak perlu mengubah DNS atau SSL; file Certbot lama tetap dipakai.
