> ARSIP versi 0.2. Informasi fitur dan hasil tes pada dokumen ini belum diperbarui untuk versi 0.3; lihat README.md dan RELEASE-NOTES-v0.3.md.

# QA aktual — v0.2.0, 15 Oktober 2026

## Eksekusi

- Build TypeScript + Vite + HTML mandiri: PASS.
- Vitest: **75 PASS / 0 FAIL**, 5 file.
- Media: **9/9 MP4 PASS**, FFprobe memverifikasi H.264 768×432, 6 detik per klip. FFmpeg mendekode seluruh frame setiap klip tanpa error.
- Frame akhir dari seluruh 9 MP4 dirender menjadi contact sheet dan diperiksa: label warna/bentuk serta jumlah apel sesuai. Ini inspeksi aset video, bukan screenshot aplikasi browser.
- Runtime Node 24.19.0; React 19.3.0; Vite 8.3.4; Vitest 5.0.4; jsdom.

## Cakupan otomatis

- 304 seed: jawaban tersedia dan unik, variasi minimal, pilihan berdasarkan level, petunjuk berbeda, matematika benar.
- 81 seed matematika; tambah, kurang termasuk nol, jumlah ikon per pilihan, serta pola A-B-A → B.
- Seluruh 19 kuis: Home → kategori → dua jawaban salah → petunjuk berbeda → ulangi → 3 jawaban benar → summary → progres lokal.
- Memory dan cerita: penyelesaian tiga putaran/cabang valid.
- Video V01/V02/V03: tidak autoplay; event selesai memunculkan pertanyaan; salah menghasilkan petunjuk; benar melanjutkan; progres ketiga putaran tersimpan.
- Jeda/tonton ulang, error codec, penolakan play promise, motion-off, langsung jawab, Escape keluar menghentikan media.
- Parameter suara default 1,15×/pitch1,04/volume0,82 dan pilihan kecepatan; fallback nilai invalid; pilihan dan penyimpanan preferensi.
- Penanganan SpeechRecognition di-stub: izin ditolak, network, timeout, pembatalan, hasil tak jelas, serialisasi TTS/ASR.
- Parent gate, penghapusan, ekspor tanpa identitas, migrasi pengaturan, progres, reminder tanpa memutus sesi, fokus Arrow (geometri mock), Escape.
- HTML produksi standalone di jsdom: memuat gambar dan React, menjawab kuis; semua 18 aset video/poster tertanam, MP4 bukan payload kosong.

## Batas pengujian

- **Belum menjalankan aplikasi di browser nyata.** Tool QA browser yang diwajibkan lingkungan tidak tersedia. Tidak mengklaim live preview telah dibuka.
- Test pemutar memakai stub HTMLMediaElement. Dekode FFmpeg dan tes event membuktikan media/logic; bukan bukti autoplay policy/codec pada setiap browser.
- HP 320–430px, tablet/laptop, landscape, safe area, kontras, target sentuh, Safari/Chrome/Tizen perlu uji visual nyata.
- Voice aktual, ketegasan, desahan, kualitas mikrofon anak dan izin nyata belum diuji dengar/perangkat.
- TV fisik belum diuji. ES2020 dan codec MP4 mungkin tidak didukung TV lama; fallback gambar tersedia bila aplikasi berhasil dimuat.
- Belum ada review pedagogis ahli atau audio Arab terverifikasi.

Status: implementasi runnable dan tes otomatis/media PASS, penerimaan perangkat/manual masih terbuka. Tidak mengklaim seluruh Phase T0 selesai.
