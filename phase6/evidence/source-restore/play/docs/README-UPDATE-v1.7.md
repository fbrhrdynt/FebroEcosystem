# Febro Arcade v1.7 — Silly Physics Rework

**Target:** `/opt/play` (Unified Febro Arcade v1.5+)

URL tetap:
- `https://play.febro.id/hoof-hustle/`
- `https://play.febro.id/octo-ascent/`
- `https://play.febro.id/leaderboard/`

## Yang berubah

**Hoof Hustle**: mode berjalan santai tanpa countdown dan tanpa finis wajib; kaki diangkat dengan menahan Q/W/O/P, lalu dilepas untuk mendorong kuda maju. Langkah lebih jauh, tumbukan, ketidakseimbangan, terjungkal, tombol bangun, jumlah jatuh, rekor jarak lokal. Landscape, desktop, dan mobile dengan header Febro Arcade serta 4 tombol besar.

**Octo Ascent**: satu gurita tanpa lawan atau balapan; delapan tentakel W/E/I/O/S/D/K/L. Tahan untuk melepas/mengangkat tentakel, lepaskan untuk menempelkan lebih tinggi. Sistem tarikan pegangan, melorot bila dukungan kurang, jatuh/mulai dari dasar, tinggi terbaik lokal. Dinding bata dan 8 tombol sentuh berwarna.

**Leaderboard**: game tetap terhubung ke profil/nickname Febro Arcade dan memakai peringkat jarak kuda (mode `sandbox`, satuan meter) dan tinggi gurita (mode `freeclimb`, satuan meter), **bukan waktu tercepat**. Skor lama mode `race50` dan `climb8` tidak dihapus dari database, tetapi tidak menjadi pilihan aktif di laman leaderboard. Pengiriman rekaman terjadi saat percobaan berakhir karena jatuh atau pemain me-reset permainan. Tidak ada balapan/limit waktu.

Implementasi original HTML5 Canvas dari analisis perilaku rekaman yang diberikan; **bukan** hasil menyalin kode, model 3D, atau aset game referensi. Versi ini adalah pendekatan 2D cartoon, bukan replika 3D identik.

## Instal dari WinSCP + PuTTY

1. Upload `febro-arcade-v1.7-physics-update.zip` ke `/home/ubuntu/`.
2. Jalankan berikut dalam satu sesi PuTTY sebagai user `ubuntu`:

```bash
set -e
cd /opt/play

# Hindari perubahan SQLite saat backup; game statis masih dapat dilihat.
pm2 stop febro-arcade-api

sudo mkdir -p /opt/play/backups
STAMP=$(date +%Y%m%d-%H%M%S)
sudo tar -czf "/opt/play/backups/pre-physics-v17-$STAMP.tgz" \
  public/hoof-hustle public/octo-ascent public/leaderboard \
  services/leaderboard storage/leaderboard
sudo chmod 600 "/opt/play/backups/pre-physics-v17-$STAMP.tgz"

unzip -t /home/ubuntu/febro-arcade-v1.7-physics-update.zip
sudo unzip -o /home/ubuntu/febro-arcade-v1.7-physics-update.zip -d /opt/play

sudo chown -R ubuntu:ubuntu /opt/play/public/hoof-hustle /opt/play/public/octo-ascent
sudo find /opt/play/public/hoof-hustle /opt/play/public/octo-ascent -type d -exec chmod 755 {} \;
sudo find /opt/play/public/hoof-hustle /opt/play/public/octo-ascent -type f -exec chmod 644 {} \;

node --check /opt/play/services/leaderboard/server.mjs
pm2 restart febro-arcade-api --update-env
pm2 save
sudo nginx -t && sudo systemctl reload nginx
```

Jika terjadi kegagalan sebelum PM2 di-restart, jalankan `pm2 restart febro-arcade-api` untuk mengembalikan API lama saat memeriksa pesan error.

## Tes

```bash
curl -fsS https://play.febro.id/api/leaderboard/health
curl -I https://play.febro.id/hoof-hustle/
curl -I https://play.febro.id/octo-ascent/
curl -I https://play.febro.id/leaderboard/
```

Kunjungi game, atur nama saat popup pertama kali, mainkan hingga terjatuh, kemudian buka leaderboard dan pilih **Hoof Hustle → Jarak terjauh** atau **Octo Ascent → Panjat santai**. API menolak skor yang tidak masuk akal, namun sistem anti-cheat masih dasar karena permainan berjalan di browser.

3. Patch label kartu dashboard (opsional, jika kartu masih menyebut balapan):

```bash
cd /opt/play
python3 scripts/update-sandbox-cards-v17.py
sudo python3 scripts/update-sandbox-cards-v17.py --apply
```

**Penting:** ZIP tidak berisi `storage`, `backups`, `.git`, GhaffiLand, Tribeworld, atau source game lain. Tidak perlu mengubah DNS/Nginx root/sertifikat/port/API TribeWorld.

## Push GitHub setelah tes

```bash
cd /opt/play
git status --short
git add public/hoof-hustle/ public/octo-ascent/ public/leaderboard/index.html \
  public/leaderboard/app.js services/leaderboard/server.mjs scripts/update-sandbox-cards-v17.py public/index.html
git diff --cached --check
git diff --cached --stat
# Pastikan tidak ada storage/backups/.env/private key di staging
git commit -m "feat: rework horse and octopus into silly physics sandbox"
git push origin main
```

## Rollback

Cari backup ZIP lokal di `/opt/play/backups/pre-physics-v17-*.tgz`.

```bash
cd /opt/play
pm2 stop febro-arcade-api
# GANTI filename dengan file backup yang dibuat saat instalasi.
sudo tar -xzf /opt/play/backups/pre-physics-v17-YYYYMMDD-HHMMSS.tgz -C /opt/play
pm2 restart febro-arcade-api
pm2 save
sudo nginx -t && sudo systemctl reload nginx
```

Backup dapat memuat data pribadi pemain: simpan hanya di VPS privat dan jangan push ke GitHub.
