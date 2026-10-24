# Febro Arcade — Immersive Player v1.4

Update untuk **SKYHOP, Neon Snake, Orbit Run, TribeWorld**. Tidak mengubah dashboard, leaderboard/API/SQLite, GhaffiLand, maupun JavaScript logika gameplay masing-masing.

## Tampilan baru

- Header bersama `✦ Febro Arcade / [nama game]` dengan tombol **Layar Penuh**, **Home**, dan **Close**.
- Seluruh halaman game menggunakan tinggi layar (`100dvh`) dengan scroll halaman dimatikan. Game tetap mengisi viewport walaupun Fullscreen API tidak didukung.
- `Layar Penuh` memakai Browser Fullscreen API bila tersedia (memerlukan klik pengguna). Di iPhone Safari sebagian versi hanya mendukung mode viewport karena batasan browser; tidak ada cara yang aman untuk memaksa menyingkirkan address bar.
- `Home` dan `Close` kembali ke dashboard `/`. `Close` juga keluar dari Browser Fullscreen sebelum meninggalkan game bila sedang aktif.
- SKYHOP: HUD, kontrol arah/jump dan tombol suara di layar penuh.
- Neon Snake: papan tetap proporsional (1:1), status skor/rekor, pilih speed, pause/sound/restart, kontrol arah.
- Orbit Run: canvas proporsional, jarak/nyawa, pause/sound/restart, kontrol gerak.
- TribeWorld: peta mengisi layar; manajemen desa sebagai sidebar scroll sendiri di desktop dan drawer **Desa** di HP. Klik bangunan di HP akan menutup drawer agar pengguna dapat memilih petak peta.

## Prasyarat

- Website `play.febro.id` sudah dilayani Nginx dengan root `/opt/play`.
- Game sebelumnya sudah terpasang:
  - `/opt/play/skyhop/index.html` dan `/opt/play/skyhop/game.js`
  - `/opt/play/snake/index.html` dan `/opt/play/snake/game.js`
  - `/opt/play/orbit-run/index.html` dan `/opt/play/orbit-run/game.js`
  - `/opt/play/tribeworld/index.html`, `game.js`, `style.css`
- Jika TribeWorld belum diunggah, instal ZIP `tribeworld-browser-mvp-v1.0.zip` dari sebelumnya ke `/opt/play/` **lebih dahulu**.
- Versi leaderboard v1.3 tidak wajib untuk menjalankan fullscreen, tetapi paket ini mempertahankan referensi ke leaderboard dari versi yang digunakan membuat update.

## 1 — Backup (PuTTY)

```bash
cd /opt/play
sudo mkdir -p /opt/play-backups
BACKUP="/opt/play-backups/immersive-$(date +%Y%m%d-%H%M%S)"
sudo mkdir -p "$BACKUP/assets"
for GAME in skyhop snake orbit-run tribeworld; do
  sudo mkdir -p "$BACKUP/$GAME"
  if [ -f "/opt/play/$GAME/index.html" ]; then
    sudo cp -a "/opt/play/$GAME/index.html" "$BACKUP/$GAME/"
  else
    echo "PERINGATAN: game belum ada: $GAME"
  fi
done
[ ! -f /opt/play/assets/immersive.css ] || sudo cp -a /opt/play/assets/immersive.css "$BACKUP/assets/"
[ ! -f /opt/play/assets/immersive.js ] || sudo cp -a /opt/play/assets/immersive.js "$BACKUP/assets/"
echo "Backup: $BACKUP"
```

## 2 — Upload WinSCP

Upload `febro-arcade-fullscreen-v1.4-update.zip` ke `/home/ubuntu/`.

## 3 — Instalasi aman

```bash
cd /home/ubuntu
sudo apt-get update
sudo apt-get install -y unzip
unzip -t febro-arcade-fullscreen-v1.4-update.zip

# Penting: cek bahwa setiap game sudah ada sebelum update.
for GAME in skyhop snake orbit-run tribeworld; do
  test -f "/opt/play/$GAME/game.js" || { echo "File game.js tidak ada: $GAME"; exit 1; }
done

sudo unzip -o febro-arcade-fullscreen-v1.4-update.zip -d /opt/play
sudo chown -R ubuntu:ubuntu /opt/play/assets/immersive.css /opt/play/assets/immersive.js
sudo chmod 644 /opt/play/assets/immersive.css /opt/play/assets/immersive.js
for GAME in skyhop snake orbit-run tribeworld; do
  sudo chmod 644 "/opt/play/$GAME/index.html"
done
sudo nginx -t && sudo systemctl reload nginx
```

**Catatan:** Jangan menjalankan perintah pengecekan `exit 1` dengan menyalin `for ...` secara terpisah di sesi login interaktif; jika ada game yang belum dipasang, berhenti dan instal game itu dahulu.

## 4 — Tes

```bash
curl -I https://play.febro.id/assets/immersive.css
curl -I https://play.febro.id/assets/immersive.js
curl -I https://play.febro.id/skyhop/
curl -I https://play.febro.id/snake/
curl -I https://play.febro.id/orbit-run/
curl -I https://play.febro.id/tribeworld/
```

Buka satu game di HP, putar portrait/landscape, coba tombol bergerak/jump, buka panel **Desa** pada TribeWorld dan klik **Layar Penuh** bila browser mendukung. Refresh satu kali atau hapus cache halaman jika versi lama masih muncul.

## Penjelasan teknis

- Game tetap di URL aslinya. Tidak ada iframe atau redirect; header ikut di dalam dokumen Fullscreen sehingga tidak hilang.
- Semua game dimuat dari `index.html` masing-masing, memakai CSS/JS bersama di `/assets/immersive.*`.
- Progres dan leaderboard disimpan sesuai mekanisme versi sebelumnya. File update ini tidak mengubah backend, API, database, atau key LocalStorage.
- Tampilan sidebar TribeWorld saja yang dapat di-scroll mandiri di HP; **halaman game tidak**.

## Rollback

Gunakan nilai backup yang dicetak pada langkah 1, contohnya:

```bash
BACKUP="/opt/play-backups/immersive-YYYYMMDD-HHMMSS"
for GAME in skyhop snake orbit-run tribeworld; do
  sudo cp -a "$BACKUP/$GAME/index.html" "/opt/play/$GAME/index.html"
done
# Jika sebelumnya tidak ada immersive.css dan immersive.js, hapus kedua file baru tersebut.
sudo nginx -t && sudo systemctl reload nginx
```

Tidak perlu instal npm, Node, Docker, database, PM2, sertifikat SSL baru, atau mengubah DNS.
