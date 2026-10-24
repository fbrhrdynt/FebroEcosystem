# GhaffiLand v0.3 — 15 Oktober 2026

## What's new
- Dynamic quiz engine: 10 pertanyaan atau seluruh materi; urut atau acak.
- Perluasan 0–100 dan game belasan/puluhan.
- Hijaiyah 30 entri, nama Latin dan tombol Dengar; dicatat batasan TTS browser.
- Suara pelan hingga cepat, 0.65×–1.35×.
- Nama hewan Indonesia (12 soal) dan Hewan Makan Apa? (16 soal SVG).
- 4 lagu anak dengan melodi orisinal Web Audio dan lirik interaktif.
- Pengaturan tetap disimpan di LocalStorage bersama progres versi sebelumnya.
- Situs Arcade lain tidak dimodifikasi.

## QA yang dijalankan
- Data 463 soal, 24 aktivitas, pilihan jawaban selalu punya satu jawaban benar.
- Periksa urutan dan mode acak agar semua pertanyaan dalam siklus pendek dapat dijangkau.
- Chromium simulasi mobile: navigasi enam dunia, empat lagu (mulai/berhenti), kuis hewan mode acak 16 soal hingga halaman hasil, kuis hijaiyah 30 soal dapat dimulai, pilihan kecepatan 0.65×, tidak ada pageerror.
- Belum diuji suara TTS pada iPhone fisik, mikrofon perangkat/Smart TV, atau rangkaian Vitest setelah perubahan karena lingkungan sandbox tidak memiliki akses registry npm.

## Dukungan deployment
Paket update tidak berisi aset gambar karikatur dan video; file-file itu tetap dipakai dari deployment sebelumnya. Full deploy menyertakannya. URL memakai huruf besar **`/GhaffiLand/`**, sesuai deployment sebelumnya.
