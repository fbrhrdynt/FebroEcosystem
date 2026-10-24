# Hoof Hustle — Febro Arcade

Game browser original terinspirasi mekanik kontrol kaki terpisah pada Clip-Clop Horse (tsuyatt.com). **Tidak menggunakan source, model kuda, logo, atau aset dari game referensi.**

## Isi paket

```
public/hoof-hustle/
    index.html
    style.css
    game.js
    cover.webp
    icon.svg
scripts/add-hoof-hustle-card.py
README-INSTALL.md
```

- 100% HTML5 Canvas, CSS, dan JavaScript native.
- Kontrol Q/W/O/P untuk kaki kiri belakang/kanan belakang/kiri depan/kanan depan.
- Tahan tombol untuk mengangkat kaki, lepas untuk menendang dan maju; jatuh saat terlalu miring, tekan R atau tombol BANGUN.
- Target 50 m, limit 90 detik, rekam waktu tercepat dan jarak terjauh menggunakan LocalStorage.
- Header Febro Arcade selalu terlihat, layar tidak ikut scroll pada HP/laptop, kontrol sentuh.
- Tidak membutuhkan npm, Node.js, PM2, backend, database, atau Docker.

## Instalasi VPS Ubuntu + Nginx

**Syarat:** Struktur Febro Arcade unified v1.5 yang melayani `root /opt/play/public;`.

1. Upload `hoof-hustle-febro-arcade-v1.0.zip` memakai WinSCP ke `/home/ubuntu/`.
2. Di PuTTY:

```bash
cd /home/ubuntu
unzip -l hoof-hustle-febro-arcade-v1.0.zip
sudo unzip -o hoof-hustle-febro-arcade-v1.0.zip -d /opt/play
sudo chown -R ubuntu:ubuntu /opt/play/public/hoof-hustle
sudo find /opt/play/public/hoof-hustle -type d -exec chmod 755 {} \;
sudo find /opt/play/public/hoof-hustle -type f -exec chmod 644 {} \;
```

3. Pastikan halaman dapat dibuka:

```bash
curl -I https://play.febro.id/hoof-hustle/
```

4. (Opsional) Tambahkan kartu ke dashboard secara aman, setelah game terpasang:

```bash
python3 /opt/play/scripts/add-hoof-hustle-card.py
python3 /opt/play/scripts/add-hoof-hustle-card.py --apply
```

Skrip akan memeriksa format dashboard, membuat backup HTML di `/opt/play/backups/`, dan hanya menambah kartu pada katalog. Jika struktur sudah berubah atau game sudah ada, skrip berhenti secara aman. Tidak menyentuh backend, GhaffiLand, atau database.

5. Reload Nginx **tidak wajib** untuk file statis baru. Untuk validasi: `sudo nginx -t`.

## GitHub

```bash
cd /opt/play
git status --short
git add public/hoof-hustle scripts/add-hoof-hustle-card.py public/index.html
git diff --cached --check
git commit -m "Add Hoof Hustle browser game"
git push origin main
```

**Jangan commit** folder `storage/`, `backups/`, file `.env`, maupun private key. Pastikan `.gitignore` tetap melindunginya.

## Cara bermain

- PC: tahan lalu lepas `Q` (kaki kiri belakang), `W` (kanan belakang), `O` (kiri depan), `P` (kanan depan).
- HP: tekan dan tahan tombol warna lalu lepas. Coba pasangan diagonal `Q + P`, lepas, lalu `W + O`.
- `R` untuk bangun setelah jatuh; `Space` untuk mulai, jeda, atau lanjut.
- Tombol `Home/Close` kembali ke dashboard.
- Suara bisa dinonaktifkan. Native fullscreen tidak selalu didukung Safari iPhone, tetapi layout tetap mengikuti viewport.

## Leaderboard

Versi MVP ini **hanya punya rekor lokal**. Tidak otomatis menulis ke API leaderboard global yang saat ini hanya mendukung game tertentu. Untuk menambah leaderboard global Hoof Hustle, perlu update skema skor backend secara terpisah dan validasi run yang lebih ketat.
