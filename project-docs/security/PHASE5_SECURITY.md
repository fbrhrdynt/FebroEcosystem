# Keamanan Phase 5

Status: kandidat aman untuk review terisolasi; **belum acceptance produksi**. Audit `npm audit --omit=dev --json` aktual disimpan per kandidat di evidence/audit-final-*.json; keenam exit code 0, metadata vulnerabilities.total 0. Runtime juga 0. Ini tidak mencakup dependency dev atau mengubah risiko source live.

| Paket | Sebelum | Kandidat | Keputusan / bukti |
|---|---|---|---|
| nodemailer pusat | 6.10.1 | 10.2.1 | Upgrade major yang dikaji pada API aktual createTransport/sendMail, ESM import, auth SMTP dan escaping pesan lewat fixture loopback; Node >=20 cocok Node 22.23.2. Tidak menggunakan pooling/raw/list/attachment API. Timeout/error handling live SMTP tetap acceptance terpisah. |
| google-auth-library | 9.15.1 | 9.15.1 | Tidak mengubah API Google ke major lain; signature, issuer, audience, expiry, nonce diuji dengan key sintetis dan cert fetch fixture. |
| gaxios | 6.7.1 | 6.7.1 | Temuan diwarisi uuid; override anak uuid saja, bukan mengganti API HTTP Google. |
| uuid pada gaxios | 9.0.1 | 11.1.1 | gaxios hanya memanggil require(uuid).v4 untuk boundary; CJS dan multipart request nyata ke loopback diuji. Override eksplisit harus ditinjau kembali saat upgrade gaxios. |
| Next Lamariva | 16.4.0 | 16.4.2 | Patch dalam major yang sama; audit, typecheck, regression, build dan native/browser acceptance terisolasi dijalankan. |
| ip-address Itinerary | 10.7.3 | 10.7.4 | Update transitive dalam major yang sama; tidak mengubah proses systemd atau data. |

Advisory dan range lengkap ada pada audit-central-before.json/audit-production-baseline.json, audit-src-lamariva.json, audit-src-itinerary.json. Nodemailer sebelum patch terpengaruh sejumlah advisory termasuk [GHSA-v53p-9fqp-m79j](https://github.com/advisories/GHSA-v53p-9fqp-m79j), [GHSA-39m8-27wv-hr27](https://github.com/advisories/GHSA-39m8-27wv-hr27), dan advisory alamat/raw/SSRF pada JSON audit. uuid <11.1.1: [GHSA-w5hq-g745-h8pq](https://github.com/advisories/GHSA-w5hq-g745-h8pq). Next 16.0.0–16.4.0: GHSA-2464-fhr4-w9xw, GHSA-p3m5-59mp-jv5r, GHSA-673q-mjm6-r5xr. ip-address <=10.7.3: GHSA-rxp7-6hxx-x8q5. Tidak ada finding kandidat produksi yang tersisa pada audit akhir; source live sengaja tidak diubah.

Sumber kompatibilitas upstream: [rilis Nodemailer](https://github.com/nodemailer/nodemailer/releases), [changelog Nodemailer](https://github.com/nodemailer/nodemailer/blob/master/CHANGELOG.md), [Google auth library](https://github.com/googleapis/google-auth-library-nodejs), dan source gaxios lokal pada lockfile. Klaim audit bersih berasal dari npm audit yang dijalankan, bukan dari dokumentasi web.

## Review kontrol OIDC

| Kontrol | Verifikasi dan batas |
|---|---|
| Authorization Code, PKCE S256 | Provider/RP tests menolak verifier salah dan code replay; confidential client_secret_basic, response code saja. |
| state, nonce, CSRF | One-use server-side browser-bound flow; sesi berbeda, nonce salah, exact Origin dan konfirmasi diuji. |
| redirect URI | Library exact allowlist; patch menolak wildcard dan post-logout URI insecure/credential-bearing. |
| issuer/audience/signature/expiry | openid-client discovery + nonrepudiation; provider tests, Google cert/signature fixture positif dan negatif. Tidak ada decode-only identity. |
| refresh rotation/reuse/revocation | Provider tests mencakup token berubah, reuse family ditolak dan access token dicabut; RP tidak meminta offline_access secara default. |
| RP logout | Local session dicabut terlebih dahulu, state dan exact return; lima RP diuji browser. Tidak ada klaim global logout instan/backchannel. |
| Cookies/session | Konfigurasi Secure/HttpOnly/SameSite=Lax di luar mode tes, host-only native; restart dan expiry nyata pada fixture. Secure delivery publik belum diuji di HTTPS staging. |
| Signing key/session persistence | Private RSA/JWK, cookie keys dan provider DB persisten; non-overwrite init dan overlap rotation diuji. Patch menolak direktori key symlink. Key produksi tidak disentuh. |
| Rate limit | Bounded local limiter dan trusted loopback proxy test; perlu ingress/shared limiter untuk multiproses. |
| Audit | Fixed event identifiers; tidak meneruskan raw error/token/query ke sink. Retensi/rotasi audit pusat oleh operator belum acceptance. |
| Account linking | issuer+subject → ID lokal asli; bukti lokal baru + autentikasi pusat baru + CSRF + konfirmasi; email bukan kunci merge. Collision gagal tanpa perubahan akun. |

Perubahan runtime ada di phase5/runtime/provider/provider.mjs dan adapters/client.mjs serta salinan sso enam aplikasi. Perubahan host central pada src/febro-provider.mjs. Native role/status/ownership tetap authoritative; sesi aplikasi lain dapat tetap berlaku setelah central logout sampai masa berlaku native. Kebijakan ini wajib diterima atau ditambah backchannel dalam lingkup berikutnya.

Build Next memakai outputFileTracingRoot pada direktori aplikasi dan secret build sintetis sementara; tidak membaca credential live. Template HTTPS dan log sanitization hanya file review; belum mengubah ingress. Secret staging harus dibuat terpisah oleh operator pada endpoint yang disetujui. Metadata validator tidak membuktikan Google, sertifikat, retensi, atau pemisahan secret secara kriptografis. Tidak ada real Google/SMTP success yang diklaim.
