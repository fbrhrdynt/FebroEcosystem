# Laporan keamanan Phase 4

Status: kandidat implementasi terisolasi; belum memperoleh acceptance HTTPS publik dan belum boleh diaktifkan.

Alur baru menggunakan oidc-provider 9.12.2 dan openid-client 6.8.4 dengan lockfile sendiri. Authorization Code mewajibkan PKCE S256, confidential client_secret_basic, redirect exact, state browser-bound, nonce dan verifikasi signature/issuer/audience. Token tidak dikembalikan adaptor ke frontend. Scope aplikasi hanya openid/email/profile. Refresh token provider memerlukan grant/scope yang diizinkan dan consent; token diputar setiap penggunaan dan reuse membatalkan family. Key RSA 3072-bit generator disimpan privat, initialization menolak overwrite, rotasi mempertahankan key lama. Client secrets terpisah dan registrasi ID/secret harus unik.

Provider dipasang selektif pada endpoint protokol /profile; rute Google dan handoff lama tidak tertangkap. Signing configuration harus berkas privat, bukan symlink. State OIDC ada di database khusus, terpisah dari data bisnis. Host dan HTTPS forwarded hanya diterima melalui loopback Nginx. Rate limiter percaya X-Real-IP hanya dari proxy loopback yang dikonfigurasi; spoof header dari peer lain diuji ditolak. Deployment multiproses tetap memerlukan shared/ingress limits; limiter dalam proses bukan pengganti perimeter rate limiting.

Pengaitan memerlukan dual ownership, sesi lokal yang sama, one-use state/CSRF, exact Origin, autentikasi pusat baru dan konfirmasi eksplisit. Fresh central login memerlukan cookie sesi baru setelah interaksi dimulai; cookie pusat lama tidak memenuhi prompt=login. Tidak ada penggabungan email, pembuatan akun otomatis bagi email yang sama, impor role administrator, atau penggantian akun lokal yang sedang aktif. Pemeriksaan status dan insert link berjalan dalam transaksi lokal. Files mengacu sub asli; Play mempertahankan dua riwayat bila identitas pusat sudah terkait pemain lain.

Temuan browser yang sudah diperbaiki pada kandidat: Referrer-Policy no-referrer pada form navigasi dapat menghasilkan Origin null dan mematahkan CSRF; halaman formulir sekarang menggunakan same-origin. CSP form-action mengizinkan origin provider terkonfigurasi untuk redirect POST. Header umum Lamariva tidak lagi menambahkan CSP kedua yang memblokir halaman SSO. Tidak ada wildcard origin yang ditambahkan.

Audit aplikasi menyimpan nama event tetap tanpa token, secret, password, query atau JWT. Intent/flow memiliki expiry dan one-use consumption. Link/event audit terkait transaksi; audit request disimpan terpisah dengan retensi 30 hari ketika alur baru dibuat. Provider audit privat perlu log rotation/retention operasional sebelum produksi; berkas audit tidak otomatis dibatasi ukurannya oleh aplikasi. Callback ingress snippets belum diaktifkan dan tetap menjadi gate rollout.

| Audit dependency produksi kandidat | Hasil akhir --omit=dev | Tindakan |
|---|---|---|
| Runtime OIDC | 0 | Pinned, audit awal runtime lulus; dependency tidak diubah |
| Lamariva | 0 | sanitize-html 2.18.0 -> 2.18.1, kompatibel; build/regresi lulus |
| VoltLab | 0 | Next.js 16.3.4 -> 16.4.2, upgrade dalam major yang sama; build dan API/regresi lulus |
| Itinerary | 0 | Tidak perlu perubahan dependency |
| Files | 0 | Tidak ada dependency root; runtime OIDC terpisah |
| Play leaderboard | 0 | Tidak ada dependency root; runtime OIDC terpisah |
| Pusat | **1 high, 2 moderate** | nodemailer 6.10.1, gaxios dan uuid transitive belum terselesaikan |

Nodemailer memerlukan upgrade major menurut audit; jalur Google/gaxios/uuid juga perlu review kompatibilitas. npm audit fix tanpa force dicoba di salinan pusat dan tidak menyelesaikan ketiganya. Tidak melakukan force upgrade atau perubahan SMTP/OAuth produksi. Runner menolak deploy target dengan high/critical. Versi VoltLab yang masih live belum dipatch oleh pekerjaan ini; temuan critical baseline hanya diperbaiki di kandidat, karena aktivasi produksi tidak diizinkan.

Bukti: phase4/evidence/audit-*.json, audit-final-*.json, final-validation.json, test-phase4-final.log dan screenshot browser. Audit omit=dev tidak menyatakan seluruh dependency development bebas kerentanan.

Batasan: local session aplikasi lain tidak otomatis dicabut oleh central logout atau perubahan izin pusat. Halaman logout menyatakan hal itu. Status/role native tetap diperiksa endpoint aplikasi; deny pusat berlaku pada penerbitan autentikasi/token baru. Tidak ada klaim backchannel logout atau instant revocation lintas aplikasi. Penerimaan kebijakan sesi ini, credential staging, HTTPS staging, pengujian Google nyata, log retention dan perbaikan dependency pusat masih wajib sebelum produksi.

Referensi implementasi: [oidc-provider](https://github.com/panva/node-oidc-provider), [opsi better-auth](https://better-auth.com/docs/reference/options), [account linking better-auth](https://better-auth.com/docs/concepts/users-accounts). Klaim kelulusan pada laporan ini berasal dari pengujian lokal yang benar-benar dijalankan, bukan dari sertifikasi pustaka.
