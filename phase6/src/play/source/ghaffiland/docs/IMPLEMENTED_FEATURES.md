> ARSIP versi 0.2. Informasi fitur dan hasil tes pada dokumen ini belum diperbarui untuk versi 0.3; lihat README.md dan RELEASE-NOTES-v0.3.md.

# GhaffiLand v0.2.0 — T0-B awal

Implementasi telah diuji dengan unit/DOM tests dan build; belum semua acceptance criteria perangkat nyata terverifikasi. Seluruh Phase T0 belum selesai.

## Permainan yang dapat dimainkan

| Kode | Aktivitas | Variasi | Status |
|---|---|---:|---|
| R01 | Kenal Alfabet | 26 | IMPLEMENTED |
| R02 | Huruf Besar & Kecil | 26 | IMPLEMENTED — baru |
| R03 | Huruf Awal Kata | 20 | IMPLEMENTED — baru |
| R04 | Cari Huruf Vokal | 5 | IMPLEMENTED — baru |
| R05 | Suku Kata | 20 | IMPLEMENTED |
| R07 | Baca Kata | 20 | IMPLEMENTED |
| M01 | Kenal Angka | 21 | IMPLEMENTED |
| M02 | Hitung Benda | 10 | IMPLEMENTED |
| M03 | Angka & Jumlah | 10 | IMPLEMENTED — baru |
| M06 | Tambah Apel | 25 | IMPLEMENTED |
| M07 | Apel Berkurang | 15 | IMPLEMENTED — baru |
| E02 | English Numbers | 10 | IMPLEMENTED — baru |
| E03 | English Colors | 10 | IMPLEMENTED |
| E04 | English Animals | 12 | IMPLEMENTED |
| H01 | Kenal Hijaiyah visual | 28 | IMPLEMENTED, tanpa pelafalan Arab |
| S01 | Kenal Warna | 10 | IMPLEMENTED |
| S02 | Kenal Bentuk | 6 | IMPLEMENTED — baru |
| S04 | Lanjutkan Pola | 10 | IMPLEMENTED — baru |
| G01 | Pasangan Rahasia | 5 set | IMPLEMENTED, 2–4 pasang |
| G02 | Cari Gambar | 20 | IMPLEMENTED |

Total 20 permainan: 19 kuis dengan 304 seed dan memory 5 set. Masing-masing tiga putaran, minimal lima variasi pada setiap level. Kegiatan lain: R10 cerita bercabang tiga pilihan dengan dua akhir.

## Bioskop Ghaffi — baru

| Kode | Video belajar | Materi |
|---|---|---|
| V01 | Apel datang satu-satu | 2, 3, 4 apel |
| V02 | Warna di studio Ghaffi | Merah, biru, kuning |
| V03 | Bentuk-bentuk bergerak | Lingkaran, persegi, segitiga |

Tiga pelajaran, masing-masing tiga klip MP4 animasi 6 detik (18 detik per pelajaran + waktu interaksi). Selesai klip → pertanyaan → feedback/petunjuk → pilihan lanjut. Tidak autoplay dari satu adegan ke berikutnya. Ada putar, jeda, tonton ulang, bacakan, dan langsung ke pertanyaan. Video error atau mode reduced motion menggunakan gambar pengganti dan pertanyaan yang sama.

Video berupa animasi ilustrasi sederhana lokal, bukan film karakter Ghaffi berbicara. MP4 tidak memiliki track suara; narasi browser dibacakan pada awal putar dan tersedia melalui tombol. Narasi tidak tersinkron per-frame dan bergantung voice perangkat. Tidak ada YouTube, iklan, atau unduhan video dari internet.

## Narator

Perempuan sesuai kandidat voice yang dikenali/dipilih pendamping. Pitch 1,04; volume 0,82; kecepatan default dinaikkan dari 1,03 ke **1,15**. Parent Mode menyediakan 1,05 / 1,15 / 1,25 / 1,35. Parameter telah diuji; karakter akustik perangkat belum didengar. Browser tidak memberi kontrol desahan/gender langsung.

## Status fitur lain

- IMPLEMENTED: welcome, 6 kategori, player, summary, stiker, Parent Mode, child gate, reminder, ekspor JSON, hapus data, mode tanpa penyimpanan, keyboard/D-pad dasar.
- PARTIAL: progres hanya setelah sesi selesai; visual responsif belum diuji browser nyata; remote TV belum diuji perangkat fisik; suara dan mikrofon nyata belum diuji.
- UNAVAILABLE pada lingkungan pembuatan: preview user-facing tanpa deployment. Diberikan HTML mandiri dan source runnable.
- PLANNED T0-B: R06 gabung suku kata; M04 banyak/sedikit; M05 urutan angka; E01 English ABC; E05 Daily Words; H02 cari hijaiyah; H03 pasang hijaiyah; S03 cocokkan bentuk; D01 hewan/suara; D02 buah/sayur; G03 puzzle.
- Di luar scope: akun, backend, VPS, GitHub, domain, deployment, chatbot bebas, PWA, musik, upload avatar.
