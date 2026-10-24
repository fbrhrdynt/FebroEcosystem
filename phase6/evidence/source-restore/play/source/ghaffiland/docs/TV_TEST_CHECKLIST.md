# Checklist HP, laptop, Samsung Smart TV

Status awal seluruh pemeriksaan perangkat: BELUM DIUJI. Tes otomatis DOM tidak mengubah status ini.

## Laptop
- [ ] Buka HTML standalone di browser dengan JavaScript aktif; cek gambar dan 12 aktivitas.
- [ ] Jalankan Vite pada localhost dan bandingkan dengan HTML.
- [ ] Tab/Shift+Tab, Arrow Up/Down/Left/Right, Enter/Space bisa memainkan semua aktivitas.
- [ ] Fokus kontras tidak hilang setelah memilih jawaban atau membuka pasangan kartu.
- [ ] Escape kembali ke kategori/beranda; berhenti menghentikan audio/mikrofon.

## HP/tablet
- [ ] Viewport 320, 360, 390, 430, 768, 1024 px: tidak ada scroll horizontal/clipping.
- [ ] Portrait dan landscape: pertanyaan dan pilihan bisa dijangkau dengan scroll normal.
- [ ] Setiap target interaksi minimal 56 CSS px (checkbox memakai keseluruhan label).
- [ ] Safe area iPhone, zoom teks 200%, prefers-reduced-motion.
- [ ] Android Chrome dan Safari iOS: touch-only, penyimpanan, file HTML, audio, penolakan mic.
- [ ] Tidak ada autoplay audio sebelum aksi pengguna.

## TV fisik
- [ ] Catat model TV, tahun, versi Tizen/browser.
- [ ] Buka melalui URL jaringan lokal Vite dari perangkat dalam Wi-Fi yang sama.
- [ ] Jika kode tidak didukung oleh TV lama, jangan menyatakan lulus; gunakan perangkat browser modern.
- [ ] Buka Parent Mode dengan remote; aktifkan tampilan TV.
- [ ] D-pad bergerak ke pilihan yang masuk akal, fokus jelas, tidak keluar viewport.
- [ ] Enter/OK memilih; Back/Escape menutup/keluar.
- [ ] Selesaikan 12 aktivitas serta cerita tanpa mic dan tanpa drag.
- [ ] Memory: pasangan yang cocok/terbuka dinonaktifkan, tombol lanjut tetap terjangkau.
- [ ] Kalau TTS/ASR tidak tersedia, UI tetap utuh dengan gambar dan teks.
- [ ] Uji 16:9 1920×1080 dan 1280×720, overscan/margin, keterbacaan dari sofa.

Catat masalah dan browser/perangkat sebelum mengklaim dukungan TV produksi.
