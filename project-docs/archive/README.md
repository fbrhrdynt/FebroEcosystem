# Febro Ecosystem v2.0.0
**by Febro Herdyanto**

Node.js 22+, Nginx, PM2, SQLite. **Non-Docker.** One backend (default `127.0.0.1:3470`) serving 10 subdomains by Host header. Package ini merupakan **pengganti** paket lama Utility Suite v1.0.0, bukan patch terhadap instalasi yang belum diunggah.

## 1. Subdomain / fitur

| Subdomain | Fungsi | Akses |
| --- | --- | --- |
| tools.febro.id | JSON, Base64, URL encode, SHA-256, password, UUID, text metrics | Publik, proses lokal browser |
| qr.febro.id | QR web/text/Wi-Fi/vCard, PNG/SVG | Publik |
| convert.febro.id | Merge PDF, extract halaman PDF, PNG/JPG -> PDF, TXT -> PDF | Publik, rate-limited, tanpa penyimpanan permanen |
| short.febro.id | URL shortener, custom alias, TTL, statistik klik dan disable | Login & verified email |
| snip.febro.id | Code snippets private/public, create/read/update/delete | Login & verified email untuk edit |
| lab.febro.id | Showcase proyek/eksperimen | Publik |
| api.febro.id | REST UUID, QR, short link dan manajemen API key | GET publik; POST /short perlu key |
| docs.febro.id | Dokumentasi API/proyek, OpenAPI YAML | Publik |
| verify.febro.id | Editor QR drag/drop pada PDF + pemeriksaan validasi | Penerbitan admin only, verifikasi QR publik |
| auth.febro.id | Login email/Google, email verification, reset password | Publik |

Footer/header proyek menampilkan **by Febro Herdyanto**. Tema light/dark mengikuti preferensi browser yang disimpan lokal.

## 2. Prasyarat

- VPS Ubuntu dengan Node.js **22.13+** (`node -v`; contoh v22.23.2), npm, PM2, Nginx dan certbot.
- DNS record `A` untuk setiap subdomain di atas menuju IP VPS.
- Port 3470 belum terpakai: `sudo ss -ltnp | grep ':3470'`.
- Mailbox Hostinger `info@logisourcedigital.web.id` yang aktif + SMTP password.
- Untuk Google login: OAuth Client ID dan Client Secret tipe **Web application** dari Google Cloud Console (tidak dapat dibuat otomatis tanpa akses akun).
- Jangan membuat config Nginx lain menggunakan `server_name` yang sama.

## 3. Upload via WinSCP

**Jangan upload ZIP v1.0.0 lama.** Upload dan ekstrak isi folder ZIP **Febro_Ecosystem_v2.0.0.zip** ke `/opt/febro-ecosystem`.

Di terminal SSH:

```bash
sudo mkdir -p /opt/febro-ecosystem
sudo chown ubuntu:ubuntu /opt/febro-ecosystem
sudo chmod 750 /opt/febro-ecosystem
```

Login WinSCP sebagai `ubuntu`, upload **isi folder** `Febro_Ecosystem_v2`, sehingga file `/opt/febro-ecosystem/package.json` benar-benar ada (bukan terletak di nested folder).

```bash
cd /opt/febro-ecosystem
npm install --omit=dev
npm run check
npm test
bash scripts/setup.sh
nano .env
```

`setup.sh` menghasilkan APP_SECRET panjang secara acak, membuat direktori privat, dan mengamankan `.env` agar tidak world-readable. Sesuaikan field berikut:

```dotenv
NODE_ENV=production
HOST=127.0.0.1
PORT=3470
BASE_DOMAIN=febro.id
ADMIN_EMAILS=febroherdyanto@outlook.com

SMTP_HOST=smtp.hostinger.com
SMTP_PORT=465
SMTP_SECURE=true
SMTP_USER=info@logisourcedigital.web.id
SMTP_PASS=ISI_PASSWORD_MAILBOX_ASLI
SMTP_FROM="Febro Ecosystem <info@logisourcedigital.web.id>"

GOOGLE_CLIENT_ID=ISI_CLIENT_ID
GOOGLE_CLIENT_SECRET=ISI_CLIENT_SECRET
GOOGLE_REDIRECT_URI=https://auth.febro.id/auth/google/callback

ALLOW_REGISTRATION=true
ALLOW_SHORTENING=true
# APP_SECRET otomatis diisi setup.sh, JANGAN ganti setiap restart.
APP_SECRET=...otomatis...
DATA_DIR=./data
```

**Jangan** menyalin contoh `.env` di atas secara utuh setelah `setup.sh`, karena akan menimpa secret yang baru dibuat. Jangan commit `.env` / `data/` ke GitHub.

## 4. PM2

```bash
cd /opt/febro-ecosystem
pm2 start ecosystem.config.cjs
pm2 save
pm2 list
pm2 logs febro-ecosystem --lines 40
curl -fsS http://127.0.0.1:3470/health
```

Jika port 3470 bentrok, ubah `PORT` `.env`, `proxy_pass` file Nginx dan `ecosystem.config.cjs` bila diperlukan. Restart PM2 setelah `.env` diubah: `pm2 restart febro-ecosystem --update-env`.

## 5. Nginx & SSL

```bash
sudo cp /opt/febro-ecosystem/deploy/nginx-febro-ecosystem.conf /etc/nginx/conf.d/febro-ecosystem.conf
sudo nginx -t
sudo systemctl reload nginx
```

Tunggu DNS mengarah ke IP VPS, lalu:

```bash
sudo certbot --nginx --redirect \
  -d tools.febro.id -d lab.febro.id -d api.febro.id \
  -d docs.febro.id -d qr.febro.id -d convert.febro.id \
  -d short.febro.id -d snip.febro.id \
  -d verify.febro.id -d auth.febro.id
```

Setelah HTTPS terbit, Nginx akan melayani TLS dan meneruskan request dengan `Host` asli ke proses Node di `127.0.0.1:3470`. Jangan membuka port 3470 secara publik. Pastikan firewall hanya mengizinkan 80/443/SSH dan service lain yang memang dipakai.

Cek:

```bash
curl -I https://tools.febro.id
curl https://api.febro.id/v1/api/uuid
curl -I https://docs.febro.id/openapi.yaml
```

## 6. Konfigurasi Google Login

1. Buka **Google Cloud Console → APIs & Services → OAuth consent screen**. Atur brand app, kontak dan scope `openid`, `email`, `profile`; tambahkan akun tester jika masih dalam mode Testing.
2. **Credentials → Create credentials → OAuth client ID → Web application**.
3. Masukkan **Authorized redirect URI** persis: `https://auth.febro.id/auth/google/callback`.
4. Salin **Client ID** dan **Client secret** ke `.env`.
5. `pm2 restart febro-ecosystem --update-env` dan uji login via `auth.febro.id`.

Implementasi backend menggunakan Authorization Code + PKCE + state sekali pakai, kemudian verifikasi Google ID token pada server. Login Google dengan email non-Gmail (misalnya Outlook) juga memerlukan konfirmasi **mailbox email** sebelum mendapatkan hak akses private/admin, untuk mencegah auto-link email pihak ketiga. Bila email telah terdaftar dengan password, login email dahulu dan gunakan **Account → Hubungkan Google**; Google tidak otomatis mengambil alih akun berdasarkan email yang kebetulan sama.

### Mengaktifkan akun administrator khusus

1. Registrasi di `https://auth.febro.id/register` menggunakan `febroherdyanto@outlook.com` sesuai `ADMIN_EMAILS`.
2. Buka email verifikasi, konfirmasi alamat email.
3. Login ke auth.febro.id, pilih **Account → Hubungkan Google** bila ingin Google login selanjutnya.
4. Buka `https://verify.febro.id`, klik Login bila perlu. Hak admin muncul hanya saat email benar-benar terverifikasi dan terdaftar di `ADMIN_EMAILS`.

Jangan menggunakan Gmail dengan email berbeda dari `ADMIN_EMAILS` dan berharap langsung menjadi admin. Tambahkan email tersebut secara sadar ke `ADMIN_EMAILS` bila memang ingin mengizinkannya.

## 7. SMTP Hostinger / reset password HTML

- Pastikan mailbox `info@logisourcedigital.web.id` sudah benar-benar dibuat pada Hostinger Email.
- Gunakan `SMTP_HOST=smtp.hostinger.com`, `SMTP_PORT=465`, `SMTP_SECURE=true`, `SMTP_USER` email lengkap, `SMTP_PASS` password mailbox yang sebenarnya (bukan password panel domain).
- `SMTP_FROM` sebaiknya alamat dari mailbox tersebut; konfigurasi DNS SPF/DKIM/DMARC domain agar deliverability membaik.
- Pengguna yang lupa password mengunjungi `https://auth.febro.id/forgot`; link berlaku **15 menit** dan token hanya dapat digunakan sekali. Email HTML sudah dirancang khusus dengan button, URL fallback, branding dan pernyataan keamanan.
- Jika SMTP belum dikonfigurasi, pendaftaran email dan forgot password belum dapat mengirim email; Google untuk alamat Gmail tetap bisa login bila OAuth configured.

## 8. QR Document Verification

Halaman privat: `https://verify.febro.id` (admin only).

**Workflow:** login admin → upload PDF max. 8 MB / 50 halaman → tentukan judul → preview browser dengan PDF.js → pilih halaman → geser QR menggunakan mouse/jari → ubah ukuran → klik **Terbitkan PDF dengan QR** → download PDF.

QR diarahkan ke `https://verify.febro.id/v/<uuid>`; publik melihat status registri (draft, valid, revoked), judul, validator, tanggal WIB, UUID, dan **SHA-256 hasil PDF**. Pengunjung dapat memilih file lokal lalu menghitung SHA-256 secara **langsung di browser** untuk memeriksa kecocokan hash, tanpa upload file ke server.

**PENTING:** Ini adalah **validasi berbasis registri dan QR**, **bukan tanda tangan digital tersertifikasi** dan **bukan** bukti bahwa QR tidak dapat disalin. Berkas PDF private hanya dapat diunduh oleh admin pemiliknya. QR dapat dipindahkan ke PDF berbeda; fungsi pembandingan hash membantu mendeteksi perubahan berkas.

Batas v2: PDF tidak boleh terenkripsi; halaman dengan rotasi internal 90/180/270 derajat perlu dinormalisasi dahulu agar posisi QR benar. Validasi penerbitan bersifat sekali terbit untuk setiap record; dokumen valid bisa dicabut. Hindari dokumen sangat sensitif tanpa evaluasi keamanan dan kebijakan retensi.

## 9. Converter dan upload safety

- Convert mendukung PDF merge, extract pages, PNG/JPG -> PDF, dan `.txt` -> PDF.
- Input diproses di memory dan tidak dipertahankan sebagai file permanen.
- DOCX/DOC/XLSX/PPTX -> PDF belum diaktifkan: konversi Office lewat headless LibreOffice harus di-sandbox/isolasi proses dulu untuk upload publik.
- Batas request 8 MB, maksimal 5 file. Konversi PDF terenkripsi tidak didukung. TXT kompleks dengan font non-Latin punya batasan render.
- Private validator menyimpan PDF sumber serta hasil di direktori dengan chmod 0700, tidak melalui static public route; unduhan memerlukan autentikasi dan kepemilikan.

## 10. REST API

`GET https://api.febro.id/v1/api/uuid` — JSON UUID (public)

`GET https://api.febro.id/v1/api/qr?text=Hello&format=png&width=360` — PNG (public)

`POST https://api.febro.id/v1/api/short` — JSON dengan bearer API key:

```bash
curl -X POST https://api.febro.id/v1/api/short \
  -H 'Content-Type: application/json' \
  -H 'Authorization: Bearer fb_YOUR_KEY_HERE' \
  -d '{"url":"https://example.com","days":30,"alias":"example-2026"}'
```

Key dibuat dan dibatalkan pada `https://api.febro.id` setelah login, token mentah ditampilkan **hanya sekali**. Dokumentasi mesin: `https://docs.febro.id/openapi.yaml`. Dokumen dan katalog proyek bisa diedit di `src/docs.mjs`.

## 11. Keamanan dan operasi

Sudah diimplementasikan:
- Password hash via scrypt, password minimal 12 karakter.
- Token reset/verifikasi sekali pakai disimpan dalam bentuk SHA-256.
- Login Google server-side dengan state, PKCE, verifikasi signature/audience ID token.
- Cookie session **host-only** dengan nama `__Host-fb_session`, `HttpOnly`, `Secure`, `SameSite=Lax`; **tidak** memakai `Domain=.febro.id` untuk menghindari bocor ke aplikasi subdomain lain.
- Single-use handoff tiket dalam URL **fragment** (bukan query) untuk login lintas subdomain, TTL 60 detik.
- CSRF `Origin` exact match pada mutasi cookie-auth; API bearer token terpisah.
- Rate limits per sumber, kuota URL per user, admin role dan kepemilikan dokumen.
- Upload dibatasi ukuran/jumlah; dokumen privat tidak disajikan sebagai aset statis.
- CSP, no-sniff, HSTS di production, header non-cache pada data user.

**Belum termasuk:** anti-malware scanning dokumen, audit eksternal OWASP, durable distributed rate limit (pembatasan saat ini in-memory), captcha adaptif/abuse reports, MFA untuk akun password, cryptographic PDF signing/sertifikat elektronik. Tambahkan ini bila layanan digunakan publik berskala besar, digunakan untuk berkas legal, atau menyimpan informasi sangat rahasia. PM2 harus **1 instance** karena SQLite bawaan dan in-memory rate limit.

**Update/deploy**:

```bash
cd /opt/febro-ecosystem
# backup dahulu
cp -a data data.backup.$(date +%F)
# upload file versi baru, jangan ganti .env atau data
npm install --omit=dev
npm run check && npm test
pm2 restart febro-ecosystem --update-env
pm2 save
```

Lindungi backup SQLite WAL (database bisa menulis `-wal` / `-shm`); untuk backup online yang konsisten sebaiknya gunakan SQLite backup API atau hentikan PM2 sesaat sebelum menyalin folder data. Backup PDF asli/hasil dan konfigurasi `.env` secara terenkripsi, jangan dimasukkan ke folder publik. Bersihkan file backup yang sudah tidak dibutuhkan setelah retensi.

## 12. Pengujian dan batas verifikasi versi ini

- `npm run check`: sintaks backend/frontend diverifikasi.
- `npm test`: test SQLite session, token reset satu pakai, isolasi link & snippets, HTTP handoff, CSRF origin, katalog, admin access.
- QR/PDF/SMTP/Google memakai library atau layanan eksternal. **Koneksi npm registry dari lingkungan build ini tidak tersedia**, sehingga QR rendering, stamping PDF via pdf-lib, OAuth nyata dan pengiriman SMTP **belum diuji end-to-end** di server yang dependencies-nya terpasang. Sesudah `npm install` di VPS, uji alur secara manual sebelum layanan dibuka luas.

### Smoke checklist pascadeploy

- [ ] Login email baru, menerima email HTML, klik verifikasi, bisa login.
- [ ] Forgot password mengirim email; token bekerja sekali, sesi lama invalid.
- [ ] Login Google berhasil; akun Existing memakai Account -> Hubungkan Google.
- [ ] QR PNG/SVG bisa dibuat dan scanner membuka isi tepat.
- [ ] PDF merge/extract/PNG->PDF berhasil dibuka di browser.
- [ ] Snippet private tidak bisa dibuka di browser tanpa login; public bisa.
- [ ] Short link redirect dan disable / expiry bekerja.
- [ ] Create API key lalu `POST /v1/api/short` berhasil; key revoked menghasilkan 401.
- [ ] Admin bisa upload PDF, drag QR, stamping, download. Scan QR menampilkan judul, nama validator, waktu WIB dan hash.
- [ ] Public tidak dapat download PDF privat; hash mismatched terdeteksi.
- [ ] Tampilan 375px ponsel, 768px tablet dan desktop diperiksa.

## 13. File penting

```text
src/server.mjs        routing, security, domain dispatch, endpoints
src/store.mjs         SQLite tables & queries
src/auth.mjs          Google OAuth, SMTP email HTML, credentials
src/files.mjs         PDF validation, QR embed, conversion
src/docs.mjs          public project catalogue
src/qr.mjs            PNG/SVG QR image
src/security.mjs      hashing, URL validation, quotas
public/index.html     app shell
public/app.css        responsive light/dark
public/app.js         tools and all user-facing pages, PDF drag/drop
scripts/setup.sh      generate secret / data folders
deploy/*.conf         Nginx reverse proxy
README.md             deployment / usage
docs-content/openapi.yaml  API spec
data/                 SQLite + private PDFs (not committed)
```
