import pathlib,json,re,shutil,datetime
R=pathlib.Path('/opt/febro-ecosystem');W=R/'phase5';E=W/'evidence';D=W/'reports'
logs=['test-phase5-acceptance.log','test-phase2-regression.log']+['final-'+a+'-regression.log' for a in ['central','files','itinerary','lamariva','voltlab']]
counts={'pass':0,'fail':0,'skipped':0};suites=[]
for name in logs:
 text=(E/name).read_text();c={key:sum(map(int,re.findall(r'^# '+key+r' (\d+)$',text,re.M))) for key in counts};assert '# duration_ms' in text,name;counts={k:counts[k]+c[k] for k in counts};suites.append({'log':name,**c})
assert counts['fail']==0,counts
skips=[('Regresi Phase 3 khusus','Dokumen/deployment dan runner khusus Phase 3 tidak ditemukan; regresi native dan Phase 2 dijalankan tanpa mengganti label sebagai Phase 3.'),('HTTPS end-to-end stack baru','Endpoint staging dan sertifikat terotorisasi belum tersedia.'),('Login Google nyata','Client/secret dan persetujuan callback staging terpisah belum tersedia; tes Google sintetis bukan bukti login Google nyata.'),('SMTP eksternal nyata','Credential SMTP staging terpisah belum tersedia; SMTP loopback sintetis sudah diuji.'),('Semua navigasi bisnis dalam browser','Browser terbatas halaman SSO/login/logout, bukan seluruh layar CV/trip/project/sharing/game.'),('Deploy/restart/migrasi produksi','Dilarang oleh ruang lingkup tugas.'),('Rollback proses produksi','Dilarang; rehearsal source-only sintetis dan verifikasi backup tersedia.'),('Acceptance logging ingress dan retensi operasional','Template disiapkan, belum dipasang/reload; canary ingress HTTPS dan rotasi audit operasional belum diterima.')]
summary={'generatedAt':datetime.datetime.now(datetime.timezone.utc).isoformat(),'automated':counts,'externalSkipped':len(skips),'suites':suites,'skippedAcceptance':[{'task':a,'reason':b} for a,b in skips],'historicalAttempts':['test-integrations.log: 21 pass, 1 timeout browser Lamariva','test-postgres-rerun.log: 0 pass, 3 gagal karena dijalankan dari cwd keliru; tidak ada mutasi produksi','test-phase5-final.log: 27 pass, 1 readiness VoltLab pada dependency isolation race; diulang setelah penyalinan selesai','Percobaan awal tes baru salah nama import googleExchange; diperbaiki menjadi googleComplete, 6 tes keamanan akhir lulus.']}
(E/'test-summary.json').write_text(json.dumps(summary,indent=2)+'\n')
N=counts['pass'];sc=len(skips)
def write(name,text): (D/name).write_text(text.strip()+'\n')
links='\n'.join(f'- [{n}]({n})' for n in ['PHASE5_FINAL_REPORT.md','PHASE5_SECURITY.md','PHASE5_TEST_RESULTS.md','PHASE5_APPLICATION_STATUS.md','PHASE5_DEPLOYMENT.md','PHASE5_BLOCKERS.md','CLEANUP_MANIFEST.md','STAGING_CHECKLIST.md'])
write('PHASE5_FINAL_REPORT.md',f'''# Laporan akhir Phase 5

Pekerjaan implementasi aman selesai pada {summary['generatedAt']}. **BELUM SIAP PRODUKSI; tidak di-deploy.** Kandidat enam aplikasi berada di `/opt/febro-ecosystem/phase5/src`; sumber dan layanan produksi tetap dipertahankan.

Remediasi nyata: pusat Nodemailer 6.10.1 → 10.2.1, override uuid 9.0.1 → 11.1.1 hanya di jalur gaxios 6.7.1, Google auth library tetap 9.15.1. Lockfile diperbarui dan API SMTP serta multipart CJS diuji. Tambahan audit aktual: Lamariva Next 16.4.0 → 16.4.2 dan Itinerary ip-address 10.7.3 → 10.7.4. Tidak memakai npm audit fix --force. Audit produksi enam kandidat dan runtime OIDC: 0 temuan pada eksekusi akhir; tidak menyatakan dependency development atau produksi live bersih.

Hardening: RP menolak testOnly pada NODE_ENV=production sebelum discovery; provider menolak wildcard redirect, HTTP/credential-bearing post logout; direktori signing provider menolak symlink. Runtime kanonis dan enam salinan aplikasi disinkronkan. Signing key produksi tidak diganti. Validator staging menolak domain produksi, callback drift, HTTP, metadata otorisasi/Google yang belum lengkap. Template HTTPS belum dipasang.

Hasil akhir otomatis **{N} PASS, {counts['fail']} FAIL, {counts['skipped']} SKIPPED pada runner**. Ada **{sc} aktivitas acceptance SKIPPED** yang dicatat terpisah. Dua belas command syntax/type/regression/API dan dua build Next diperiksa dalam bukti; lihat laporan tes untuk status persisnya. Chromium benar-benar mengeksekusi login/logout kelima RP pada 375, 430, 768, 1024, 1440px, menghasilkan 25 screenshot; ini bukan browser acceptance stack Google/HTTPS nyata. Percobaan gagal selama pengembangan tidak disembunyikan dan bukan hasil akhir.

Preservasi: checksum backup Phase 4 diverifikasi ulang, tiga SQLite integrity/FK lulus, tiga PostgreSQL restore di cluster privat terisolasi lulus, lima objek dokumen/vault cocok. Rehearsal rollback hanya fixture sumber sintetis; tidak membuktikan rollback proses produksi. Pemeriksaan produksi akhir: lihat preservation.json untuk HTTP/HTTPS, PID dan nol perubahan sumber yang dipantau. Database produksi tidak dimigrasi, record akun/ownership/leaderboard tidak ditulis oleh pengujian.

SSO_PHASE3_DEPLOYMENT.md tidak ada. Tujuh referensi primer lain dibaca lengkap. Inventaris source, package, port, pengelola, database dan baseline ada di evidence. Laporan root historis tetap karena tercatat checksum/referensi; salinan di project-docs/archive. Tidak ada backup/secret/data/source lama dihapus.

Blocker: endpoint HTTPS staging, secret/registrasi Google dan SMTP terpisah, acceptance rangkaian penuh, sanitasi log callback/retensi audit operasional, penerimaan kebijakan sesi native dan persetujuan rollout terpisah. Itinerary tetap dikelola ls-itinerary.service; tidak dibuat proses PM2 duplikat. Tidak ada restart PM2/systemd, reload Nginx, DNS/SSL, credential OAuth live atau penonaktifan login legacy.

## Laporan

{links}

Artefak review baru: `phase5/releases/<app>/`, tidak menimpa `phase4/releases`. Dashboard: `/opt/febro-ecosystem/PHASE5_STATUS.md`.
''')
write('PHASE5_SECURITY.md','''# Keamanan Phase 5

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
''')
write('PHASE5_APPLICATION_STATUS.md','''# Status enam aplikasi

Semua kandidat ada di phase5/src/<app>, **belum boleh aktivasi produksi**. Tidak ada metode login legacy dihapus. Inventaris mesin aktual: evidence/application-inventory.json, services-before.json, preservation.json.

| Aplikasi | Source produksi / port / pengelola | Auth dan DB | Hasil kandidat / ownership |
|---|---|---|---|
| Febro Space | /opt/febro-ecosystem /3470/ PM2 febro-ecosystem | Email/password/Google dan sesi SQLite data/ecosystem.sqlite; provider baru terpisah | Dependency pusat dipatch; bridge fresh session, protokol dan legacy regression diuji. users.id tetap. |
| Lamariva | /opt/lamariva /3035/ PM2 lamariva | better-auth email/password/Google; PostgreSQL 127.0.0.1:5432/lamariva | Next dipatch dan batas tracing build dikunci pada direktori kandidat; native signed-cookie, link eksplisit dan Document.userId asli diuji, cross-user access ditolak. |
| Itinerary | /opt/ls_itinerary /3015/ systemd ls-itinerary.service | Legacy OIDC/password; PostgreSQL 127.0.0.1:5432/logisource_itinerary | Password fallback kandidat dan /auth/space; trips.owner_id, collaborator/role native dipertahankan; dependency dipatch. Tidak dibuat PM2 duplikat. |
| VoltLab | /opt/voltlab /3025/ PM2 voltlab | Google/admin password, hashed session PostgreSQL 127.0.0.1:5432/voltlab | Native session, project/workspace pemilik, role/admin isolation dan collision diuji; learning progress tidak dipindah. |
| Files | /opt/febro-files /3480/ PM2 febro-files | Legacy OIDC, SQLite /opt/febro-files/data/files.sqlite | Mapping ke accounts.sub asli, nodes.owner_sub, quota/share/download/native regression; vault/storage dipertahankan. |
| Play | /opt/play/public dan services/leaderboard /3488/ PM2 febro-arcade-api | Guest cookie dan SQLite /opt/play/storage/leaderboard/arcade.sqlite | Guest tetap tanpa login; sesi SSO opsional terpisah; server memilih pemain, score/runs/bests historis tidak digabung otomatis. |

Dependency aplikasi pusat: busboy, google-auth-library, nodemailer, pdf-lib/pdfjs-dist/qrcode. Lamariva: Next/React, better-auth, Prisma/pg, renderer/docx. Itinerary: Express/session/pg, bcrypt/jose. VoltLab: Next/React/pg/jose. Files dan Play memakai Node/SQLite serta runtime SSO independen. Versi package manifest live lengkap ada di evidence/preservation.json; lockfile kandidat disertakan artefak.

Masing-masing RP menukar code dan memverifikasi identitas melalui openid-client sebelum menerbitkan sesi native sendiri. Tidak membuat akun berdasarkan email. Role tidak diimpor dari IdP. Uji pengaitan, konflik, pemilik dan restart memakai database sintetis, bukan akun pengguna asli. Backup ownership asli diverifikasi offline; tidak ada migrasi data produksi.

Semua readiness: **siap review artefak / belum acceptance HTTPS dan Google / belum produksi**. Native sessions aplikasi lain tetap mengikuti masa berlaku lokal saat central logout. Rollout Itinerary hanya oleh operator systemd yang berwenang, sesudah approval terpisah.
''')
write('PHASE5_BLOCKERS.md','''# Blocker Phase 5

Status keseluruhan **BLOCKED UNTUK PRODUKSI**, sementara implementasi dan pengujian terisolasi yang aman selesai.

1. Belum ada enam origin HTTPS staging terotorisasi dan sertifikat tepercaya untuk stack baru. Template tanpa secret tersedia; konfigurasi produksi tidak diubah.
2. Belum ada Google client/secret staging terpisah, bukti exact callback registration dan login Google nyata. Credential produksi yang ada tidak dipakai ulang. SMTP eksternal staging juga belum diuji.
3. Belum ada acceptance satu rangkaian browser pusat nyata → lima RP lewat HTTPS, termasuk Secure cookies, callback logging canary dan full business navigation. Fixture bukan bukti Google nyata.
4. Callback ingress/log retention/rotasi audit pusat dan shared rate limits bila scaled perlu konfigurasi/operator acceptance. Snippet review belum dipasang.
5. Kebijakan sesi lokal yang tetap hidup setelah central logout harus diterima atau backchannel/bounded revalidation diimplementasikan dalam scope berikutnya. Tidak mengklaim logout global instan.
6. Approval rollout/rollback per aplikasi belum ada. Tidak dibuat otomatis. Itinerary memerlukan operator systemd; tidak boleh PM2 duplicate.
7. SSO_PHASE3_DEPLOYMENT.md dan runner khusus Phase 3 tidak ditemukan. Regresi Phase 2 dan aplikasi existing dijalankan; isi/history Phase 3 tidak direka.
8. Source live tidak dipatch oleh tugas ini. Audit kandidat bersih bukan bukti dependency produksi live bersih. Sebelum cutover perlu backup baru yang mencakup tulisan pengguna setelah snapshot Phase 4 dan review drift ulang.

Langkah berikut persis: operator menetapkan origin/TLS staging, membuat secret/registrasi terpisah, mengisi metadata tanpa secret, menjalankan validator, memasang stack kandidat di staging terpisah, menguji Google/email dan semua acceptance, meninjau artefak/checksum serta backup terbaru, kemudian meminta approval produksi terpisah. Tidak ada perintah aktivasi yang dijalankan di Phase 5.
''')
write('PHASE5_DEPLOYMENT.md','''# Persiapan deployment dan rollback Phase 5

**REVIEW ONLY — belum deploy.** Tidak ada restart layanan produksi, reload Nginx, DNS/SSL, credential OAuth live, migrasi produksi atau penghapusan login lama. Artefak Phase 4 tidak ditimpa.

## Pemeriksaan aman

Dari /opt/febro-ecosystem: `python3 phase5/scripts/review-release.py verify central` dan ganti app dengan lamariva, itinerary, voltlab, files, play. Program hanya menyediakan prepare/verify; tidak menyediakan operasi deploy. Periksa juga `sha256sum -c SHA256SUMS` di direktori release. Manifest memuat source hash dan checksum sebelum perubahan dari baseline Phase 4. `source.tar.gz` berisi delta; `candidate-source.tar.gz` berisi snapshot source kandidat lengkap dengan source-manifest.json. Keduanya tidak mengandung env, key, DB, upload, node_modules atau .next.

Jangan mengeksekusi runner `phase4/scripts/release.py` terhadap artefak baru: runner itu menargetkan source/manifests Phase 4 dan tetap utuh. Script lain yang disalin ke phase5/scripts dengan jalur warisan adalah referensi, bukan command deployment Phase 5. Tidak ada approval JSON dibuat.

## Reproduksi kandidat terisolasi

1. Review source/manifest dan checksum; extract candidate-source.tar.gz hanya setelah verifikasi path member, ke direktori staging baru tanpa source/data produksi. Gunakan filesystem terpisah dan database sintetis, jangan mengekstrak di /opt aplikasi live.
2. `npm ci --ignore-scripts` pada root kandidat yang memiliki lockfile dan `npm ci --ignore-scripts --omit=dev` pada setiap sso/. Files/Play root tanpa dependency aplikasi hanya perlu sso/. Play package aplikasi ada di services/leaderboard. Jangan npm install melalui symlink node_modules development. Audit `npm audit --omit=dev`; jangan memakai audit fix --force.
3. Untuk Lamariva jalankan Prisma generate dan npm run build secara eksplisit; generate tidak menerapkan migrasi. VoltLab npm run build. Node apps menggunakan npm run check; tidak memiliki bundling build script.
4. Siapkan native schema hanya di DB sintetis/staging yang disetujui; migrasi mapping additive dari runtime/repository.mjs harus direview dan diuji dua kali, tanpa email backfill. Native tests sudah melakukan fixture migration/idempotence. Jangan mengarahkan runner migrasi legacy ke DB produksi.
5. Ikuti STAGING_CHECKLIST.md: endpoint, BASE_DOMAIN/issuer, lima registrasi, Google/SMTP dan data/secret terpisah; template HTTPS belum siap install sampai placeholder diganti dan divalidasi operator. Logging callback harus aman sebelum traffic nyata.
6. Jalankan pengujian terisolasi dari workspace root dan rangkaian HTTPS/Google nyata; jangan build Next bersamaan dengan server test yang memakai .next sama. Catat acceptance independen, jangan menyamakan fixture dengan sertifikasi stack.

## Aktivasi produksi di luar pelaksanaan ini

Dibutuhkan review/approval baru per aplikasi, backup baru serta verifikasi restore/checksum, penerimaan sesi/logout, secret dan callback production exact, audit/build/regression terbaru, rollback dependency/build yang direview, drift check serta operator berwenang. Urutan provider dahulu lalu Lamariva, Itinerary, VoltLab, Files, Play satu per satu. Itinerary tetap ls-itinerary.service oleh operator systemd; tidak PM2 duplikat. Tidak ada command aktivasi otomatis Phase 5.

## Rollback yang aman

Sebelum perubahan yang kelak disetujui, simpan source changed-file, package/lockfile, dependency/build dan manifest checksum terbaru secara privat. Bila perlu rollback, operator mengembalikan hanya source yang berubah beserta lockfile/dependency/build yang sesuai, menghentikan proses hanya di jendela yang disetujui, memeriksa syntax/build lalu memulihkan proses lewat pengelola aslinya dan memeriksa health/auth/data.

Jangan restore DB lama untuk rollback rutin. Biarkan mapping/link baru, akun, ID lokal, role, ownership, trip/collaborator, dokumen/project, file/share, runs/bests/skor dan uploads tetap ada. Jangan menonaktifkan legacy login. Signing key lama harus tetap tersedia selama masa berlaku token plus skew; key produksi tidak diganti dalam Phase 5.

Rehearsal `python3 phase5/scripts/isolated-rollback.py` memulihkan source fixture sambil memeriksa hash data/leaderboard sintetis. Ini bukan eksekusi runner produksi atau bukti pemulihan layanan produksi. Backup Phase 4 diverifikasi/restore privat; backup tersebut historis, bukan pengganti backup saat cutover.
''')
rows='\n'.join(f"| {a} | SKIPPED | {b} |" for a,b in skips)
suiteRows='\n'.join(f"| {s['log']} | {s['pass']} | {s['fail']} | {s['skipped']} |" for s in suites)
write('PHASE5_TEST_RESULTS.md',f'''# Hasil pengujian Phase 5

Eksekusi akhir: **{N} PASS, {counts['fail']} FAIL, {counts['skipped']} SKIPPED runner**. Aktivitas acceptance terpisah: **{sc} SKIPPED**, bukan dihitung lulus. Tidak menjumlahkan ulang rerun sebagai tes baru.

| Suite/bukti | PASS | FAIL | SKIPPED runner |
|---|---:|---:|---:|
{suiteRows}

Suite Phase 5 memuat 22 tes integrasi/regresi turunan Phase 4 dan 6 tes hardening/kompatibilitas baru. Phase 2 dijalankan terpisah (12 tes). Regresi native lima aplikasi berjumlah 58 tes, termasuk dua proses TAP VoltLab (21 engine + 7 keamanan). Harness API VoltLab merupakan command tambahan, tidak dihitung sebagai tes TAP baru. Dua belas command check-all final exit 0; hasil di final-validation.json. Dua build Next ada di build-final-summary.json; aplikasi Node tidak mempunyai production bundle script, sehingga check/syntax dipakai untuk entrypoint-nya (N/A bundling).

Cakupan nyata: code/PKCE, state/nonce/replay/CSRF, exact redirect, issuer/audience/signature/expiry, refresh rotation/reuse/revocation, native login/logout, fresh dual proof, collision rejection, issuer+subject mapping, local ID, cross-user permission/ownership, guest Play/skor historis, session expiry dan restart recovery. Provider key/session persistensi dan rotasi overlap diuji dengan material sintetis, tanpa mengganti key live. Tes SMTP memanggil sendMail aplikasi ke server SMTP loopback berautentikasi; tes Google memakai signature RSA dan cert fixture, bukan jaringan Google.

Browser Chromium benar-benar berjalan pada 375, 430, 768, 1024, 1440px untuk Lamariva, Itinerary, VoltLab, Files, Play. Login, identitas native, no-horizontal-overflow halaman SSO dan logout diuji, 25 screenshot di evidence/screenshots. UI pusat/protokol diuji oleh host/provider fixture; tidak mengklaim browser stack produksi baru atau seluruh navigasi bisnis.

Verifikasi pendukung: semua checksum backup Phase 4 cocok; SQLite central/files/play integrity ok dan nol FK violations; tiga pg_restore pada cluster baru unix-socket-only lulus dan nol FK invalid; lima referenced assets cocok checksum. Rehearsal rollback source-only sintetis mempertahankan hash user/ownership dan skor. Release membership dan tiap SHA256 source dicek; hasil release-verification.json. Pemeriksaan health produksi lama HTTP/HTTPS bukan acceptance integrasi baru.

| Aktivitas | Status | Alasan |
|---|---|---|
{rows}

Percobaan awal: test-integrations.log mencatat timeout logout Lamariva; test-postgres-rerun.log mencatat tiga error cwd; test-phase5-final.log mencatat readiness VoltLab saat dependency isolation berlangsung. Harness import Google awal juga dikoreksi. Timeout navigasi browser dinaikkan untuk kompilasi Next terisolasi; dependency diselesaikan sebelum eksekusi acceptance akhir. Hasil akhir memakai test-phase5-acceptance.log; hasil percobaan awal tidak dinyatakan lulus.

Command reproduksi aman dari /opt/febro-ecosystem: `node --test phase5/tests/*.test.mjs`, `node --test sso-phase2/tests/*.test.mjs`, `python3 phase5/scripts/check-all.py`. Jangan build aplikasi Next pada .next yang sedang digunakan suite native. Restore backup hanya di lingkungan privat baru, bukan database live.
''')
records=json.loads((E/'cleanup.json').read_text());rows='\n'.join(f"| {x['original']} | {x['new']} | {x['action']} | {x['reason']} | {x['rollback']} |" for x in records)
write('CLEANUP_MANIFEST.md',f'''# Manifest housekeeping Phase 5

Inventaris sebelum housekeeping: evidence/root-inventory.json. Tidak ada sumber produksi, env, database, upload, sertifikat, key, backup atau leaderboard historis dihapus. Seluruh Phase 4 release, backup manifest, evidence, checksums, migrasi/rollback dan snapshot tetap di jalur lama.

Root historical reports tercatat pada baseline/source checksum dan saling dirujuk; sebagian dipakai dokumentasi/runner. Karena keamanan referensi belum dapat dibuktikan untuk pemindahan, **disalin ke arsip dan sumber asli dipertahankan**. Tidak ada rename yang dapat mematahkan jalur. Seluruh laporan historis dipertahankan walaupun superseded.

| Jalur asal | Jalur baru | Tindakan | Alasan | Rollback |
|---|---|---|---|---|
{rows}

| Jalur asal | Jalur baru | Tindakan | Alasan | Rollback |
|---|---|---|---|---|
| phase4/apps dan runtime/tests | phase5/src, runtime/tests | Salinan kandidat tanpa secret/data | Isolasi patch dan QA; source/evidence lama utuh | Biarkan kandidat review; tidak ada source produksi yang perlu dikembalikan |
| phase5/reports/*.md | project-docs/current/ | Salinan dokumentasi current | Akses mudah | Sumber laporan tetap phase5/reports |
| phase5/reports/PHASE5_SECURITY.md | project-docs/security/ | Salinan | Indeks keamanan | Sumber laporan tetap |
| phase5/reports/PHASE5_DEPLOYMENT.md, STAGING_CHECKLIST.md | project-docs/deployment/ | Salinan | Indeks deployment | Sumber laporan tetap |
| Backup Phase 4 | Jalur asli sesuai phase4/evidence/backup-path | KEEP | Historis, checksum dan restore diverifikasi | Tidak perlu rollback |
| Hasil restore verifikasi run ini | phase5/evidence/restore-private | KEEP, direktori 0700 | Memuat data privat hasil restore; cluster dihentikan, tidak masuk release | Jangan dipublikasikan/dihapus sebagai housekeeping umum |
| Symlink node_modules development buatan run ini | phase5/src/{{central,lamariva,itinerary,voltlab}}/node_modules | Kandidat memakai dependency lokal | Menghindari npm install/build lewat dependency produksi | Tidak memengaruhi instalasi produksi |
| Fixture temp yang dibuat masing-masing tes | /tmp/febro-phase4-* dan /tmp/febro-phase5-* milik run ini | Lifecycle cleanup otomatis runner | Dibuat oleh tes sendiri, subprocess ditutup, tidak dirujuk source/release | Fixture sintetis dapat dibuat ulang lewat tes; bukan backup historis |

Tidak ada penghapusan manual file historis atau file tidak pasti. Prefix phase4 pada fixture berasal dari runner warisan; runner hanya membersihkan direktori yang dibuatnya sendiri pada eksekusi ini. Script Phase 4 yang disalin dengan jalur hardcoded dipertahankan sebagai referensi dan ditandai jangan dijalankan pada README; command Phase 5 yang aman disebut eksplisit.
''')
# Canonical reports are retained; current/security/deployment contain readable copies.
for p in D.glob('*.md'):shutil.copy2(p,R/'project-docs/current'/p.name)
shutil.copy2(D/'PHASE5_SECURITY.md',R/'project-docs/security/PHASE5_SECURITY.md')
for n in ['PHASE5_DEPLOYMENT.md','STAGING_CHECKLIST.md']:shutil.copy2(D/n,R/'project-docs/deployment'/n)
apps='\n'.join(f'| {a} | Kandidat diuji; belum acceptance HTTPS/Google; belum produksi |' for a in ['Febro Space','Lamariva','Itinerary','VoltLab','Files','Play'])
(R/'PHASE5_STATUS.md').write_text(f'''# Febro Space — Phase 5

**Implementasi aman selesai; BELUM SIAP PRODUKSI; tidak di-deploy.**

- Keamanan: audit `--omit=dev` enam kandidat + runtime 0 temuan; produksi live tidak dipatch. Nodemailer/uuid, Next Lamariva dan ip-address Itinerary diperbaiki pada kandidat; OIDC/staging guards diperketat.
- Tes otomatis akhir: **{N} PASS / {counts['fail']} FAIL / {counts['skipped']} SKIPPED runner**; **{sc} aktivitas acceptance SKIPPED**. 25 screenshot Chromium, lima viewport. Syntax/type/API, dua build Next, backup/restore dan rehearsal rollback: lihat bukti laporan.
- Preservasi: nol source drift yang dipantau, health enam HTTP + enam HTTPS lama 200, PID produksi tetap; tidak ada migrasi/data akun/ownership/skor/key live diubah.

| Aplikasi | Status |
|---|---|
{apps}

Blocker: HTTPS staging terotorisasi, Google/SMTP credential dan callback terpisah, acceptance end-to-end/logging/retensi/sesi, operator systemd Itinerary dan approval rollout terpisah. Referensi SSO_PHASE3_DEPLOYMENT.md tidak ditemukan.

Langkah berikut: (1) operator menetapkan origin/TLS staging dan secret baru, (2) lengkapi metadata dan validator staging, (3) jalankan acceptance Google/email/HTTPS serta logging dan native session policy, (4) verifikasi artefak/checksum dan backup baru, (5) review lalu approval produksi terpisah. Jangan jalankan runner Phase 4 untuk artefak Phase 5.

'''+ '\n'.join(f'- [{p.name}](phase5/reports/{p.name})' for p in sorted(D.glob('*.md')))+'\n\nArtefak: phase5/releases/<app>; bukti: phase5/evidence; salinan laporan: project-docs/current.\n')
print(json.dumps({'automated':counts,'externalSkipped':sc,'reports':len(list(D.glob('*.md')))}))
