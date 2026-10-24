# GhaffiLand v0.3 — main dan belajar (React + TypeScript)

## Fitur aktif

- **24 aktivitas kuis/game** dalam enam dunia, plus video pembelajaran, cerita interaktif, memory, dan buku lagu.
- **463 pertanyaan** tersedia. Alfabet A–Z besar, a–z kecil, angka 0–100, belasan dan puluhan, suku kata, warna, bentuk, English, 30 entri pembelajaran hijaiyah (28 dasar + hamzah + lam-alif), 12 hewan Indonesia, dan 16 pertanyaan makanan hewan memakai gambar SVG.
- Pada layar pemilihan game, atur **Urut / Acak**, **10 soal per sesi / Seluruh materi**. Sepuluh soal per sesi berikutnya meneruskan materi sehingga seluruh katalog bisa dicoba. Mode Acak mengacak satu siklus dan menuntaskan semua soal sebelum menyusun siklus berikutnya.
- Setiap pertanyaan mempunyai petunjuk jika jawaban salah, respon yang positif, dan tombol ulangi. Dapat menggunakan input sentuh dan opsi pengenalan suara di browser yang mendukung, dengan izin pendamping.
- **Nama huruf hijaiyah** disampaikan dalam bahasa Indonesia menggunakan TTS perangkat, misalnya "Alif", "Ba", "Ta", "Tsa". Tombol `Dengar` mengulang nama. Pengucapan TTS tidak menggantikan pembelajaran makhraj dari guru/rekaman asli.
- Kecepatan narator 0.65× sampai 1.35× melalui Orang tua → 15 → Suara & privasi. Suara perempuan diprioritaskan jika tersedia, tetapi browser tidak mengungkap metadata gender suara.
- **Empat lagu orisinal pendek** dengan melodi instrumental yang dihasilkan Web Audio dan baris lirik yang bisa disentuh untuk didengar via narator. Tidak ada materi audio komersial, tidak ada streaming eksternal.
- Video lama, karikatur Ghaffi, memory, pengingat jeda, pengaturan, dan progres lokal tetap dipertahankan.

## Pasang UPDATE di VPS Ubuntu, Nginx statis

Target situs: `https://play.febro.id/GhaffiLand/`.

1. Unggah `ghaffiland-v0.3-update.zip` via WinSCP ke `/opt/play/`.
2. Backup versi aktif, ekstrak file baru.

```bash
cd /opt/play
sudo mkdir -p /opt/play-backups
sudo cp -a /opt/play/GhaffiLand "/opt/play-backups/GhaffiLand-$(date +%Y%m%d-%H%M%S)"
unzip -o ghaffiland-v0.3-update.zip -d /opt/play
sudo find /opt/play/GhaffiLand -type d -exec chmod 755 {} \;
sudo find /opt/play/GhaffiLand -type f -exec chmod 644 {} \;
sudo nginx -t && sudo systemctl reload nginx
curl -I https://play.febro.id/GhaffiLand/
```

Paket **UPDATE** hanya berisi `GhaffiLand/index.html` + tiga berkas baru di `GhaffiLand/assets/`. File lama karikatur dan video **harus sudah ada** di VPS. Dashboard, SKYHOP, Snake, dan Orbit Run tidak disentuh. Tidak perlu Node, PM2, database, mengubah DNS, atau mengubah Nginx bila static root `/opt/play` sudah benar.

Untuk instalasi baru, gunakan ZIP FULL DEPLOY (bukan ZIP update) dan ekstrak di `/opt/play/`.

## Source (untuk pengembangan)

Folder `ghaffiland/` berisi React + TypeScript + Vite. Pada komputer/VPS dengan akses npm registry:

```bash
cd ghaffiland
npm ci
npm test
npm run build
```

Hasil Vite terdapat pada `dist/`, yang harus disajikan dengan Nginx. `package.json` memakai Node >=22.12.0. `npm run build` juga memperbarui HTML standalone. Untuk mengembangkan, `npm run dev`.

**Catatan build versi pengiriman:** Sandbox perakitan saat ini tidak punya akses ke registry npm. Karena itu build siap-pasang di ZIP update dibuat dengan transpiler TypeScript lokal + runtime React yang diekstrak dari bundle sumber sebelumnya. Aplikasi diuji di Chromium dengan memuat skrip lokal, tetapi `npm run build` dan rangkaian Vitest baru **belum dapat dijalankan di sandbox ini**. Pada lingkungan dengan registry npm, jalankan `npm ci && npm test && npm run build` untuk pemeriksaan tipe dan build Vite reguler. File di `dist/` paket ini sudah dapat dipakai untuk update statis tanpa build.

## Privasi dan batasan

Progres tersimpan dalam LocalStorage pada origin situs yang sama (`ghaffiland.trial.v1`). Data lama pada `play.febro.id` tetap kompatibel. Progres dicatat setelah satu sesi selesai, bukan per pertanyaan. Mikrofon OFF saat aplikasi dimuat; Web Speech Recognition pada browser tertentu dapat memakai server penyedia layanan. Aplikasi sendiri tidak mengunggah audio ke backend. Untuk suara bahasa Indonesia, perangkat harus menyediakan suara yang cocok. TTS untuk hijaiyah bersifat pendekatan nama huruf dalam bahasa Indonesia, bukan audio standar qari. Lagu memakai melodi instrumental, bukan vokal penyanyi.

## Referensi materi hijaiyah

- Buku Ajar Bahasa Arab 1, repositori UIN Datokarama — urutan dan nama 29 huruf: https://repository.uindatokarama.ac.id/id/eprint/1761/1/Buku%20Ajar%20BAR%201.pdf
- Penjelasan variasi 28/29/30 entri (termasuk lam-alif) dan pengucapan: https://www.detik.com/hikmah/khazanah/d-6571965/ada-berapa-sih-jumlah-huruf-hijaiyah-28-29-atau-30/amp

Karakter dan data gambar yang sebelumnya disediakan pemilik tetap dipakai dalam aplikasi.
