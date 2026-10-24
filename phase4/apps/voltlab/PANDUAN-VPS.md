# VoltLab by Febro Herdyanto — VPS dengan PM2 (2.4.0)

Pemasangan utama menggunakan Node.js, PM2, Nginx dan PostgreSQL langsung di Ubuntu. Docker tidak diperlukan. Domain `voltlab.febro.id` adalah contoh: ganti dengan domain Anda pada seluruh langkah.

## 1. Persiapan

Gunakan Node.js 22.13 atau lebih baru. Jalankan PM2 dengan user Ubuntu yang sama dengan aplikasi Anda sebelumnya. Hindari membuat daemon PM2 lain melalui `sudo pm2`.

```bash
node --version
npm --version
pm2 --version
sudo apt update
sudo apt install -y postgresql postgresql-contrib unzip
sudo systemctl enable --now postgresql
```

Jika PM2 belum tersedia: `npm install -g pm2`. PostgreSQL berjalan sebagai service Ubuntu; PM2 mengelola proses aplikasi. Database dan role yang dibuat khusus aplikasi bernama `voltlab`.

## 2. Upload source

Upload `VoltLab-VPS-v2.4.0.zip` melalui WinSCP ke home user Ubuntu. Untuk pemasangan baru:

```bash
sudo mkdir -p /opt/voltlab
sudo chown "$(id -un):$(id -gn)" /opt/voltlab
unzip ~/VoltLab-VPS-v2.4.0.zip -d /opt/voltlab
cd /opt/voltlab
npm ci
```

Arsip tidak memiliki folder pembungkus. Jalankan seluruh perintah npm dan PM2 berikut dari `/opt/voltlab`.

## 3. Environment dan database

```bash
node scripts/setup-env.mjs https://voltlab.febro.id
nano .env
```

Script membuat AUTH_SECRET, password database, dan DATABASE_URL yang saling sesuai; izin file 600. Isi Google credentials sekarang atau setelah membuat OAuth client di langkah 7. Port default 3025; jika port ini terpakai, ubah APP_PORT dan proxy_pass Nginx ke port kosong yang sama. Periksa dengan `sudo ss -ltnp`.

Buat database baru dan tabel:

```bash
npm run db:setup
npm run db:migrate
```

`db:setup` meminta akses sudo untuk psql sebagai postgres. Script hanya membuat role/database baru; jika nama voltlab sudah ada, script berhenti. Untuk database yang sudah ada, atur DATABASE_URL sesuai kredensialnya, lewati db:setup, lalu jalankan db:migrate. Jika `.env` dari paket sebelumnya sudah ada, tambahkan DATABASE_URL dengan kredensial PostgreSQL yang digunakan. Script migrasi mencatat migrasi yang telah diterapkan.

## 4. Build dan jalankan PM2

```bash
npm run build
pm2 start ecosystem.config.json
pm2 save
pm2 status
pm2 logs voltlab --lines 50
```

Aplikasi hanya bind ke 127.0.0.1 pada APP_PORT. Tekan Ctrl+C untuk keluar dari tampilan log tanpa menghentikan aplikasi. Uji database dan aplikasi:

```bash
curl -fsS http://127.0.0.1:3025/api/health
```

Hasil yang benar memuat `status: ok`. Aktifkan boot otomatis jika belum disiapkan untuk user PM2 Anda:

```bash
pm2 startup
```

Jalankan perintah sudo yang ditampilkan PM2, lalu `pm2 save`. Jika startup PM2 user tersebut sudah aktif, cukup `pm2 save`. Referensi: https://pm2.io/docs/runtime/guide/startup-hook/ .

## 5. Domain, Nginx dan HTTPS

Arahkan DNS A domain ke IP VPS. Buat konfigurasi di conf.d:

```bash
sudo cp deploy/nginx.conf.example /etc/nginx/conf.d/voltlab.conf
sudo nano /etc/nginx/conf.d/voltlab.conf
sudo nginx -t
sudo systemctl reload nginx
```

Sesuaikan server_name dan proxy_pass. Untuk memasang sertifikat jika Certbot belum tersedia:

```bash
sudo apt install -y certbot python3-certbot-nginx
sudo certbot --nginx -d voltlab.febro.id
```

HTTPS diperlukan untuk cookie login produksi dan Google OAuth. APP_URL harus sama dengan origin HTTPS website. Referensi Next.js: https://nextjs.org/docs/app/guides/self-hosting .

## 6. Buat administrator

Hanya identitas berikut yang memiliki izin admin:

| Email | Username |
|---|---|
| febroherdyanto98@gmail.com | febroherdyanto |
| febroherdyanto@outlook.com | fbrhrdynt |

```bash
npm run admin:setup
```

Pilih identitas, masukkan password minimal 14 karakter dan konfirmasi. Password tidak ditampilkan. Ulangi untuk akun kedua bila diperlukan. Script juga dapat digunakan untuk reset password; sesi lama akun tersebut dicabut. Admin login tersedia di `https://voltlab.febro.id/login?admin=1`. Tidak ada password default.

## 7. Aktifkan login Google untuk user

Buka Google Cloud Console: https://console.cloud.google.com/ . Buat/pilih project khusus VoltLab, kemudian buka **Google Auth Platform** (atau menu OAuth consent screen/Credentials sesuai tampilan Console).

1. Isi Branding: nama **VoltLab by Febro Herdyanto**, support email dan developer contact Anda.
2. Pilih Audience **External** jika website dipakai umum.
3. Konfigurasikan scopes dasar `openid`, `email`, dan `profile`. Aplikasi tidak meminta Drive/Gmail.
4. Buat OAuth Client dengan tipe **Web application**.
5. Tambahkan origin website: `https://voltlab.febro.id`.
6. Tambahkan **Authorized redirect URI** persis:

   ```text
   https://voltlab.febro.id/api/auth/google/callback
   ```

7. Gunakan homepage `https://voltlab.febro.id`, privacy policy `/privacy` dan terms `/terms` jika diminta. Domain induk `febro.id` mungkin perlu diverifikasi sesuai permintaan Google.
8. Salin Client ID dan Client Secret ke `.env` di VPS:

   ```dotenv
   GOOGLE_CLIENT_ID=CLIENT_ID_ANDA.apps.googleusercontent.com
   GOOGLE_CLIENT_SECRET=CLIENT_SECRET_ANDA
   ```

9. Terapkan environment baru:

   ```bash
   cd /opt/voltlab
   pm2 restart voltlab
   ```

10. Saat masih mode **Testing**, tambahkan akun yang akan mencoba ke daftar Test users. Untuk dipakai publik, ubah audience publishing status ke **In production** dan selesaikan permintaan verifikasi Google bila ada.

User baru dibuat otomatis saat login Google berhasil. Email terverifikasi diperiksa server. Username/nama tampilan Google tidak dapat memberikan role admin. Email admin Gmail di atas akan mendapat role admin saat login Google. Email Outlook hanya bisa memakai tombol Google jika email tersebut memang terdaftar sebagai Google Account; alternatifnya gunakan login admin password yang disediakan.

Redirect URI harus sama persis, termasuk HTTPS, domain, dan path. Jika muncul `redirect_uri_mismatch`, cocokkan URI Console dengan `APP_URL` dan callback tersebut. Dokumentasi resmi: https://developers.google.com/identity/openid-connect/openid-connect .

## 8. Mulai menggunakan panel kompleks

1. Buka Simulator → **Panel tools** → **Build**.
2. Pilih 1–8 motor feeders, beri nama panel, pilih common emergency stop bila diperlukan.
3. Klik **Create panel**, lalu buka **Navigator** untuk fokus ke feeder atau komponen tertentu. Diagram besar otomatis di-fit; gunakan zoom untuk terminal.
4. RUN; tahan START feeder sebentar dan lepaskan. Holding mempertahankan motor. STOP atau TRIP overload hanya menghentikan feeder terkait; ES-MAIN menghentikan semua coil.
5. Dalam mode STOP, pilih group melalui header/border group. Shift+klik untuk memilih beberapa komponen, lalu pindahkan bersama.
6. Tab Organize menyediakan group/ungroup, duplicate, align, distribute, auto grid, Save block, nomor kabel dan ekspor CSV.
7. Block tersimpan di tab Blocks. Insert membuat komponen dan kabel internal dengan ID baru; sambungan luar block dibuat ulang oleh user.
8. Pilih kabel, buka Properties, ubah label/warna/area dan `Routing bend X` untuk mengatur jalur kabel.

Auto grid menata posisi saja; koneksi terminal tetap sama. Gunakan Undo bila layout belum sesuai. Mode engine tetap model edukasi; ukuran proteksi/kabel dalam generator bukan rekomendasi desain panel nyata.

## 9. Kelola user

Login dengan akun admin → **Admin & settings**. Admin dapat mencari user, menambah akun awal, memblokir atau mengaktifkan user, mencabut sesi, menghapus user dengan konfirmasi email, serta melihat audit log. Menambah user tidak mengirim email undangan otomatis. User tetap login Google dengan email yang sama.

Akun admin dicadangkan dan tidak dapat dihapus/diblokir lewat panel. Semua endpoint admin memeriksa role server-side. Mengubah frontend, nama tampilan, atau payload JSON tidak memberikan izin admin.

## 10. Backup, update dan pemeliharaan

```bash
cd /opt/voltlab
npm run db:backup
```

Backup tersimpan di `backups/*.sql.gz` dengan izin privat. Salin backup ke lokasi lain. Untuk restore ke database kosong yang telah disiapkan, gunakan psql/pg_restore sesuai format SQL ini; pastikan database tujuan benar sebelum menjalankan restore. Client pg_dump harus sama atau lebih baru dari server PostgreSQL.

Bersihkan sesi dan rate limit kedaluwarsa secara berkala:

```bash
node --env-file=.env scripts/cleanup.mjs
```

Update source: backup dahulu, simpan `.env`, hentikan aplikasi selama build, ekstrak source baru, lalu:

```bash
pm2 stop voltlab
npm ci
npm run db:migrate
npm run build
pm2 restart voltlab
pm2 save
curl -fsS http://127.0.0.1:3025/api/health
```

Jika build gagal, proses tetap berhenti; pulihkan source/build sebelumnya sebelum restart. Untuk perubahan APP_PORT: `pm2 restart voltlab`; sesuaikan juga Nginx. Untuk membaca log: `pm2 logs voltlab --lines 100`. Jangan menjalankan `pm2 delete all` untuk mengelola aplikasi ini.

## 11. Verifikasi setelah pemasangan

- Health endpoint berhasil dan login administrator berfungsi.
- Konfigurasikan OAuth lalu coba login Google di domain HTTPS.
- Dua akun biasa mempunyai workspace terpisah dan tidak dapat membuka admin.
- Uji save/reload rangkaian, panel generator, blokir dan pencabutan sesi user.
- Donasi membuka https://saweria.co/fbrhrdynt .

Paket telah diuji build dan fungsi aplikasi di workspace pengembangan. Belum dipasang di VPS Anda; login Google live memerlukan konfigurasi Google milik Anda.

## Docker opsional

Dockerfile dan compose.yaml masih tersedia bagi operator yang memilih container. Jalur pemasangan di atas seluruhnya native PM2. Jika memilih Compose, environment DATABASE_URL untuk app diberikan oleh compose.yaml dan DB_PASSWORD digunakan oleh service db; gunakan panduan Compose yang sesuai sebelum mengoperasikannya. Jangan menjalankan PM2 dan Compose pada port yang sama.
