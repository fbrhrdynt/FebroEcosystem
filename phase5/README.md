# Phase 5 — kandidat review, belum deploy

Sumber enam aplikasi ada di `src`, runtime kanonis di `runtime`, tes di `tests`, bukti di `evidence`, artefak baru di `releases`. Tidak ada secret, data produksi atau aktivasi otomatis dalam artefak.

Jalankan dari `/opt/febro-ecosystem`:

- `node --test phase5/tests/*.test.mjs`
- `node --test sso-phase2/tests/*.test.mjs`
- `python3 phase5/scripts/check-all.py`
- `python3 phase5/scripts/verify-preservation.py`
- `python3 phase5/scripts/review-release.py verify central` (atau aplikasi lain)
- `node phase5/scripts/validate-staging.mjs /path/to/staging-metadata.json`

Jangan build Next bersamaan dengan pengujian native Next di direktori kandidat yang sama. Dependency central, Lamariva, Itinerary dan VoltLab terpasang lokal kandidat; dependensi runtime/provider dan alat QA dibaca dari instalasi yang ada melalui symlink development, dikecualikan dari arsip. Pemasangan ulang deployment wajib dari lockfile independen. Tidak ada npm install melalui symlink produksi.

Script lain yang disalin dari Phase 4 adalah referensi historis, beberapa memiliki jalur hardcoded Phase 4/produksi. **Jangan jalankan script baseline, integrate, sync-runtime, release, backup atau migrasi approval warisan sebagai prosedur Phase 5.** Gunakan hanya command review yang tercantum di atas. Tidak ada approval file dibuat. Prosedur staging dan rollback ada di laporan deployment.
