# Febro Space Phase 6 — kandidat terisolasi

Kode aplikasi: `src/{central,lamariva,itinerary,voltlab,files,play}`. Tidak diaktifkan di produksi.
Runtime OIDC disalin ke setiap aplikasi dan tersedia di `runtime/`. Dependency pengembangan central dan runtime memakai link instalasi kandidat sebelumnya; release tidak menyertakan link tersebut. Jalankan `npm ci` pada aplikasi dan `sso/` masing-masing dalam lingkungan deployment terpisah.

Verifikasi aman dari `/opt/febro-ecosystem`:

- `node --test phase6/tests/*.test.mjs` — database sintetis dan browser; Google fixture bukan login Google nyata.
- `python3 phase6/scripts/check-all.py` — syntax, tipe, regresi dan API native.
- `node phase6/scripts/validate-staging.mjs /absolute/path/staging.json` — metadata saja.
- `node phase6/scripts/deployment-gates.mjs /absolute/path/gates.json` — pemeriksaan read-only, tidak mengaktifkan deployment.

Jangan menjalankan script deployment Phase 4/5 untuk artefak Phase 6. Jangan menjalankan build Next pada direktori kandidat yang sedang dipakai browser integration. Backup dan restore script memakai data privat; tidak termasuk release.
