# GhaffiLand v0.4 — Lagu Anak Indonesia (YouTube)

- 17 lagu klasik anak Indonesia dengan judul, kredit pencipta (jika diketahui), kanal, dan video YouTube yang ditelusuri.
- Pemutar video resmi memakai iframe `youtube-nocookie.com` dan dimuat hanya setelah tombol dipilih.
- Cari lagu, pilih lagu, acak lagu, tutup pemutar, dan buka YouTube jika embed dibatasi.
- Empat lagu GhaffiLand orisinal sebelumnya tetap ada. Tidak ada konten atau audio YouTube diunduh/disimpan.
- Empat judul menggunakan video kompilasi Kakatoo, dengan waktu mulai diarahkan ke lagu yang sesuai.
- Source addon terdapat di `addons/classic-songs/`. Versi `dist/index.html` langsung dapat di-deploy tanpa Node atau npm.
- Source sudah menyalin addon ke `public/assets/` dan memanggilnya lewat `index.html`, sehingga build Vite berikutnya tetap membawa addon. Addon berintegrasi melalui DOM (bukan komponen React utama).
- YouTube dan video berhak cipta adalah layanan/konten pihak ketiga. Periksa izin pemutaran, video dapat berubah/hilang, iklan/rekomendasi dapat muncul. Orang tua mendampingi.
