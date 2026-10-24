# Aset dan dependency

- `public/assets/ghaffi-mascot.png`: disalin tanpa perubahan dari lampiran pengguna, hanya untuk trial keluarga. Tidak ada izin publikasi pihak ketiga yang diasumsikan.
- `src/components/Art.tsx`: ilustrasi SVG lokal dibuat untuk aplikasi ini.
- Font memakai fallback sistem, tanpa unduhan font.
- Dependency React, React DOM, Vite, TypeScript, Vitest, jsdom mengikuti lisensi masing-masing paket. Bundle produksi menyertakan lisensi React yang dipertahankan bundler. Source/lockfile disertakan agar versi dapat direproduksi.

- `public/videos/*.mp4` dan `*.jpg`: animasi ilustrasi edukasi lokal dari `scripts/generate-videos.py`, tanpa footage pihak ketiga atau rekaman suara. Font DejaVu dipakai saat render aset, tidak diunduh browser.
