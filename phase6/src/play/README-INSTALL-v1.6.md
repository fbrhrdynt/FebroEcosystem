# Febro Arcade v1.6 — Hoof Hustle + Octo Ascent + Global Player Name

**Target:** `https://play.febro.id/`, proyek terpusat pada `/opt/play`.
**Tidak menggunakan Docker.** Game berupa file statis di `/opt/play/public`, leaderboard API tetap pada PM2 `febro-arcade-api`, SQLite tetap `/opt/play/storage/leaderboard`.

## Isi update

- `/hoof-hustle/`: versi Hoof Hustle dengan pengiriman **waktu finish 50m** ke leaderboard global.
- `/octo-ascent/`: game baru original 2D, delapan tentakel W/E/I/O/S/D/K/L, dinding 8m, tiga rival AI.
- Popup **nama panggilan saat pertama kali main**: sama untuk SKYHOP, Snake, Orbit Run, Hoof Hustle, Octo Ascent, TribeWorld, GhaffiLand. Nama tersimpan pada cookie profil API yang sama. Untuk GhaffiLand, nickname bukan hasil pertandingan; game ini tidak punya peringkat publik karena ditujukan untuk anak-anak.
- Halaman `/leaderboard/`: dua tab baru. Mode Hoof 50m dan Octo 8m menampilkan **waktu tercepat**; mode lama tetap menggunakan skor tertinggi.
- API Node + SQLite: menambah `name_set` (auto-migration saat start) dan dua mode balapan. Data lama tidak dihapus.
- Script penambahan kartu dashboard aman dan idempotent; **tidak menimpa `public/index.html`**.

## Sebelum instalasi: backup dan hentikan API sementara

Pastikan `pm2 status` menampilkan `febro-arcade-api` dan endpoint lama berhasil:

```bash
curl -i https://play.febro.id/api/leaderboard/health
```

Upload `febro-arcade-v1.6-update.zip` ke `/home/ubuntu` via WinSCP.

```bash
cd /opt/play
sudo mkdir -p backups
pm2 stop febro-arcade-api
# Stop sebentar agar salinan SQLite konsisten.
sudo tar -czf "backups/pre-v16-$(date +%Y%m%d-%H%M%S).tgz" \
  public/index.html public/leaderboard public/assets/leaderboard-client.js \
  services/leaderboard storage/leaderboard
```

Periksa file backup sebelum lanjut: `sudo ls -lh /opt/play/backups/pre-v16*`.

## Install update

```bash
cd /opt/play
unzip -t /home/ubuntu/febro-arcade-v1.6-update.zip
sudo unzip -o /home/ubuntu/febro-arcade-v1.6-update.zip -d /opt/play
sudo chown -R ubuntu:ubuntu /opt/play/public/hoof-hustle /opt/play/public/octo-ascent

# Lihat perubahan dashboard tanpa mengedit
python3 /opt/play/scripts/update-dashboard-v16.py
# Jika jumlah katalog masuk akal, terapkan (buat backup dashboard otomatis):
python3 /opt/play/scripts/update-dashboard-v16.py --apply

node --check /opt/play/services/leaderboard/server.mjs
pm2 restart febro-arcade-api --update-env
pm2 save
sudo nginx -t && sudo systemctl reload nginx
```

### Tes

```bash
curl -i https://play.febro.id/api/leaderboard/health
curl -I https://play.febro.id/hoof-hustle/
curl -I https://play.febro.id/octo-ascent/
curl -I https://play.febro.id/assets/player-name.js
```

Health harus memuat `hoof` dan `octopus`. Buka `/leaderboard/` dan pastikan tab Hoof Hustle + Octo Ascent terlihat. Coba melalui browser baru/incognito: nickname popup muncul lalu masukkan nama panggilan 2–18 karakter. Setelah finish, skor waktu dikirim otomatis. Popup dapat dilewati dengan konsekuensi ronde tidak masuk peringkat, dan bila API offline, game masih bisa dimainkan.

### CATATAN

- **Tidak ada Nginx location tambahan** jika reverse proxy `/api/leaderboard/` sudah dipasang dari v1.5. Jangan ubah SSL atau vhost lain.
- Nama untuk leaderboard tersimpan dalam cookie `fa_player` HTTP-only milik browser. Untuk perangkat berbeda, identitas pemain tetap berbeda; belum ada akun global bersama.
- Datanya sudah ada dalam SQLite lama, **jangan hapus `/opt/play/storage`**.
- Anti-cheat masih sebatas validasi tiket sekali pakai, durasi, dan skor masuk akal; game berjalan di browser sehingga skor tidak 100% tahan manipulasi.
- Game baru orisinal terinspirasi mekanik referensi, tidak menggunakan aset mereka.

## Push ke GitHub

```bash
cd /opt/play
git status --short
# Periksa sekali lagi .gitignore harus mengecualikan /storage/ dan /backups/
git check-ignore -v storage/ backups/
git add public/hoof-hustle/ public/octo-ascent/ public/leaderboard/ \
 public/assets/player-name.js public/assets/leaderboard-client.js \
 public/snake/index.html public/orbit-run/index.html public/skyhop/index.html \
 public/tribeworld/index.html public/GhaffiLand/index.html \
 services/leaderboard/server.mjs scripts/update-dashboard-v16.py public/index.html

git diff --cached --check
git diff --cached --name-only
# Jika tidak ada database, .env, private key, atau backup yang ikut:
git commit -m "Add Octo Ascent, Hoof global ranking, player nicknames"
git push origin main
```

## Rollback darurat

Jika server tidak berjalan setelah update, `pm2 logs febro-arcade-api --lines 40 --nostream` dan pastikan Node.js mendukung `node:sqlite`.

Backup ada di `/opt/play/backups/pre-v16-...tgz` (jangan extract tanpa memeriksa file). Hentikan PM2 sebelum memulihkan SQLite. Pemulihan database harus dilakukan hanya jika diperlukan—jangan sampai skor baru yang masuk sejak update tertimpa.
