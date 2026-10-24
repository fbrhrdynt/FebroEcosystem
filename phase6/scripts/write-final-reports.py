import pathlib,json,re,hashlib,datetime
w=pathlib.Path('/opt/febro-ecosystem/phase6');out=pathlib.Path('/home/ubuntu/febro-phase6');e=w/'evidence'
logs=['acceptance-final.log','phase2-regression.log','final-central-regression.log','final-files-regression.log','final-itinerary-regression.log','final-lamariva-regression.log','final-voltlab-regression.log','account-dashboard-final.log']
rows=[];total=0
for name in logs:
 text=(e/name).read_text();passes=sum(map(int,re.findall(r'^# pass (\d+)$',text,re.M)));fails=sum(map(int,re.findall(r'^# fail (\d+)$',text,re.M)));skips=sum(map(int,re.findall(r'^# skipped (\d+)$',text,re.M)));assert passes and not fails and not skips,(name,passes,fails,skips)
 rows.append(f'| {name} | {passes} | {fails} | {skips} |');total+=passes
# Revocation is new; central-host in this rerun is already counted above.
assert '# pass 2' in (e/'central-provider-final.log').read_text();total+=1
checks=json.loads((e/'final-validation.json').read_text());assert len(checks)==12 and all(x['exitCode']==0 for x in checks)
builds=json.loads((e/'build-results.json').read_text());assert len(builds)==2 and all(x['exitCode']==0 for x in builds)
audit=json.loads((e/'audit-final-summary.json').read_text());assert all(x['vulnerabilities']['total']==0 for x in audit.values())
i=json.loads((e/'inventory.json').read_text());b=i['backup'];pres=json.loads((e/'preservation.json').read_text());assert not any(pres['sourceDrift'].values()) and not any(pres['pidChanged'].values())
apps=[('Febro Space','central','eco.febro.id','users.id; dokumen/snippet/link'),('Lamariva','lamariva','cv.febro.id','user.id; Document.userId'),('Itinerary','itinerary','itinerary.febro.id','users.id; trips.owner_id dan trip_members.user_id'),('VoltLab','voltlab','voltlab.febro.id','users.id; workspaces.owner_id/progres'),('Files','files','files.febro.id','accounts.sub; nodes.owner_sub/share/quota/vault'),('Play','play','play.febro.id','players.id; runs/bests.player_id')]
table='| Aplikasi | Kandidat Phase 6 | Produksi aktual |\n|---|---|---|\n'+'\n'.join(f'| {name} | Kode integrasi dan tes terisolasi tersedia | Versi lama tetap aktif; SSO Phase 6 BELUM diaktifkan; BELUM siap produksi |' for name,_,_,_ in apps)
status=f'''# Status Febro Space Phase 6

24 Oktober 2026. **Implementasi aman dan persiapan rilis selesai; keseluruhan BELUM SIAP PRODUKSI. Tidak ada aktivasi.**

Kode nyata berada di `{w}/src`, runtime di `runtime`, enam arsip review di `releases/<app>/source.tar.gz` beserta manifest SHA256. Kandidat Phase 5 disalin terisolasi; source aktif tidak ditimpa.

Perubahan baru: dashboard Account dengan launcher lima aplikasi sesuai akses pusat, preferensi tema per akun tersimpan, sesi aktif tanpa token/hash, pencabutan sesi lain; pengguna belum login diarahkan ke login dan yang sudah login langsung melihat dashboard. Pengaitan Google memerlukan password/bukti autentikasi baru maksimal lima menit, sesi yang sama dan callback pada host yang sama. Pengaitan lintas host lama ditolak. Logout pusat/reset password/blokir/revoke admin mencabut state sesi/grant/token provider terkait. Sesi native RP lain masih mengikuti masa berlaku lokal dan tidak diklaim logout global instan.

Header halaman RP/interaksi/logout provider memakai strict-origin agar query callback tidak bocor dan pemeriksaan Origin formulir tetap berfungsi. Review gate berbasis bukti/checksum gagal tertutup dan tidak memiliki fungsi aktivasi. Zod kandidat Lamariva/VoltLab menjadi 4.6.7 (record schema VoltLab disesuaikan ke API v4); body-parser Itinerary 2.4.0 via override, Nodemailer Lamariva 10.2.1 dan fast-uri 3.1.9. Production dependency tidak dipatch.

Hasil unik akhir: **{total} PASS / 0 FAIL / 0 SKIPPED runner**, 12 command check, dua build Next sukses. Acceptance eksternal yang belum dilakukan dicantumkan terpisah. Audit --omit=dev enam kandidat dan runtime: 0 temuan. Ini bukan audit dependency development atau bukti produksi live aman.

{table}

Backup baru privat `{b}`: SQLite online backup, tiga pg_dump, source/config enam layanan, private asset/auth metadata serta vhost terkait dan unit Itinerary. Restore tiga PostgreSQL pada cluster privat tanpa listener TCP, tiga SQLite serta enam source archive lulus. Lima objek file/dokumen yang dirujuk snapshot ditemukan dan checksum cocok. Backup 0700/0600. Sumber/PID produksi tetap, nol source drift. Tidak ada perubahan akun, ownership, role, data bisnis, skor, Nginx/DNS/TLS atau restart layanan.

URL HTTPS lama keenam aplikasi memberi 200. Namun discovery URL eco `/profile/.well-known/openid-configuration` masih mengumumkan `https://auth.febro.id`; ini BUKAN issuer kandidat baru. Google status configured=true tetapi callback live `https://auth.febro.id/auth/google/callback`, berbeda dari expected eco `https://eco.febro.id/profile/auth/google/callback`. Kehadiran credential bukan bukti izin Google Console atau login berhasil.

Gate belum terpenuhi: HTTPS staging terotorisasi; Google nyata dan exact callback/origin; mapping akun pengguna nyata dengan dual proof; acceptance ingress/log retention dan kebijakan sesi RP; approval operator per aplikasi. Tidak meminta aktivasi sebelum gate teknis selesai. Lihat BLOCKERS.md, TEST_RESULTS.md, DEPLOYMENT.md, ROLLBACK.md dan CLEANUP_MANIFEST.md. Bukti lengkap privat `{e}`.
'''
(out/'STATUS.md').write_text(status)
tests=f'''# Hasil pengujian Phase 6

**{total} tes unik PASS, 0 FAIL, 0 SKIPPED pada hasil akhir runner.** Rerun tidak dijumlahkan ulang.

| Bukti di {e} | PASS | FAIL | SKIPPED runner |
|---|---:|---:|---:|
'''+ '\n'.join(rows)+'''
| central-provider-final.log — hanya tes revoke provider baru; tes central-host duplikat tidak dihitung | 1 | 0 | 0 |

OIDC yang diuji memakai provider nyata dalam fixture sintetis: discovery, code/PKCE S256, pertukaran token, state/nonce/CSRF, replay, redirect allowlist, issuer/audience/signature/expiry, refresh rotation/reuse dan revocation, persistence/restart dan consent. Integrasi native lima RP menjaga ID/ownership/role dan menolak email collision atau penggantian akun. Guest Play dan historical runs dipertahankan. Sesi akun diuji isolasi antar pengguna, expiry, pencabutan, CSRF, tanpa token/hash di response, preferensi dan fresh password Google linking. Revocation provider diuji idempotent dan tidak menghapus akun lain.

Chromium lima RP pada 375, 430, 768, 1024, 1440px: 25 screenshot. Dashboard pusat pada kelima ukuran, light/dark: 10 screenshot; login unauthenticated, dashboard authenticated, tema, sesi dan ordinary-user admin isolation lulus. Screenshot diperiksa pada mobile; tidak ada overflow dalam pemeriksaan otomatis. Transport dashboard diproksikan secara sintetis ke backend privat; URL https dalam browser bukan bukti TLS nyata.

12 check-all command berhasil: syntax central/files/itinerary/play, typecheck Lamariva/VoltLab, regresi native dan API VoltLab. Dua build Next exit 0 menggunakan secret sintetis dan DB build loopback tidak aktif. Audit akhir kandidat/runtime 0 vulnerabilities; audit mencakup --omit=dev saja.

Restore PostgreSQL, SQLite, source dan checksum referenced assets lulus. Rehearsal rollback hanya fixture source, ID/ownership/skor tetap. Release membership/checksum diverifikasi. Baseline/final PID dan source produksi tidak berubah.

| Acceptance terpisah | Status | Alasan |
|---|---|---|
| HTTPS staging rangkaian pusat → lima RP | BELUM DIJALANKAN | Origin/TLS staging terotorisasi belum disediakan |
| Google nyata sampai sesi RP | BELUM DIJALANKAN | Credential/Console/callback staging dan akun uji belum tersedia |
| SMTP eksternal | BELUM DIJALANKAN | Hanya fixture SMTP loopback; tidak menggunakan credential live |
| Seluruh layar bisnis dan mapping pengguna nyata | BELUM DIJALANKAN | Tes native/sintetis bukan acceptance seluruh CV/trip/proyek/share/game |
| Canary logging ingress, rotasi/retensi operasional | BELUM DIJALANKAN | Snippet review belum dipasang |
| Aktivasi dan rollback produksi | BELUM DIJALANKAN | Gate teknis dan approval operator belum terpenuhi |
| Acceptance kebijakan bounded/global revocation RP | BELUM DIJALANKAN | Sesi native RP mengikuti expiry lokal; keputusan/implementasi lebih lanjut diperlukan |

Google test menggunakan key/cert/signature fixture dan token sintetis. Tidak ada klaim login Google nyata berhasil.

Percobaan awal yang gagal tetap disimpan: integration.log/check-all.log kehilangan dependency link sso pada salinan awal dan runner integrasi dihentikan setelah timeout; instalasi Lamariva pertama exit -9 lalu sukses dengan heap dibatasi; central-final awal memakai Origin fixture yang tidak sesuai dan ekspektasi lintas-host Google lama; integration-final.log menunjukkan no-referrer membuat POST Origin tidak valid, diperbaiki ke strict-origin; account-browser.log mengalami race menunggu label status tema lama, diperbaiki menunggu perubahan tema aktual. Hasil akhir merujuk log tabel, bukan mengubah label percobaan gagal menjadi lulus.

Reproduksi dari /opt/febro-ecosystem: node --test phase6/tests/*.test.mjs; node --test sso-phase2/tests/*.test.mjs; python3 phase6/scripts/check-all.py. Jangan build Next bersamaan dengan suite native di direktori yang sama. Data tes sintetis; secret/backup privat tidak disertakan release.
'''
(out/'TEST_RESULTS.md').write_text(tests)
blockers='''# Blocker dan tindakan operator

**Aktivasi produksi DIBLOKIR.** Tidak ada persetujuan yang dibuat otomatis.

1. Tetapkan enam origin HTTPS staging yang diotorisasi, DNS/TLS tepercaya, port loopback kosong, database/storage sintetis terpisah dan akun uji. Isi phase6/staging.example.json dan jalankan validator. Jangan memakai hostname rekaan atau credential produksi untuk staging.
2. Buat Google OAuth web client staging pada Console yang dikuasai operator, lengkapi consent screen/test users, authorized JavaScript origin persis origin pusat staging, redirect HTTPS persis origin tersebut + /profile/auth/google/callback. Sediakan GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET dan GOOGLE_REDIRECT_URI di file privat 0600. Tidak memasukkannya ke laporan. Secret produksi terdeteksi hadir, tetapi hak Console/authorized origins/redirect registrations tidak dapat diverifikasi dari server.
3. Callback produksi saat ini berada pada auth lama, sedangkan expected eco berbeda. Discovery eco saat ini juga berissuer auth lama. Jangan mengubah sepihak atau menganggap dua issuer sama. Daftarkan origin/callback eco baru dalam Console pada rollout yang disetujui, pertahankan registrasi lama selama transisi, lalu buktikan Google end-to-end di staging sebelum cutover. User harus melakukan Google login nyata melalui browser; tidak ada password/MFA atau consent yang diotomatisasi tanpa pengguna.
4. Lengkapi provider signing/cookie keys persisten dan lima secret unik terpisah, registrasi callback exact. Generator provider-keys default membuat callback produksi: jangan gunakan default untuk staging. Konfigurasi staging harus berasal dari origin yang telah disetujui, bukan mengganti domain sembarang.
5. Lakukan acceptance linked-account dengan login metode lama + fresh central proof + konfirmasi. Mapping hanya (issuer,subject) ke ID lokal asli. Snapshot ownership tidak membuktikan mapping identitas pengguna nyata. Jangan merge berdasarkan email, mengubah role/owner, atau membuat akun otomatis.
6. Terapkan sanitasi access/error logging callback, HTTPS ingress rate limits, privat audit rotation/retensi, uji canary tanpa token nyata. Snippet phase6/nginx dan operations adalah review, belum dipasang. Jika scale multiproses, limiter memerlukan shared ingress/store.
7. Tinjau kebijakan sesi native RP sesudah central logout/revocation. Provider state pusat kini dicabut, tetapi sesi native aplikasi lain tidak otomatis mati. Terapkan bounded revalidation/backchannel atau terima kebijakan expiry lokal secara eksplisit sebelum menyatakan acceptance selesai.
8. Setelah semua gate teknis sukses dan bukti terikat checksum, operator memberi approval aktivasi terpisah menyebut aplikasi/artefak/window/rollback. Itinerary memakai systemd ls-itinerary.service; tidak dibuat proses PM2 duplikat. Ambil backup baru tepat sebelum rollout untuk mencakup tulisan pengguna terbaru.

Tidak ada temuan critical/high yang tersisa pada npm audit --omit=dev kandidat akhir. Ini tidak menghapus risiko dependency live yang belum dipatch maupun menggantikan acceptance keamanan operasional. SSO_PHASE3_DEPLOYMENT.md tidak ditemukan pada laporan sebelumnya; hasil/history fase itu tidak direka.
'''
(out/'BLOCKERS.md').write_text(blockers)
inventory='| Aplikasi | Path aktual | Pengelola | Ownership yang dipertahankan |\n|---|---|---|---|\n'+'\n'.join(f"| {name} | {i['apps'][key]['root']} | {i['apps'][key]['manager']} {i['apps'][key]['service']} | {ownership} |" for name,key,host,ownership in apps)
(out/'DEPLOYMENT.md').write_text(f'''# Persiapan deployment Phase 6

**PREPARED ONLY / TIDAK DIAKTIFKAN.** Gate HTTPS/Google/mapping nyata dan approval belum lengkap. Jangan menggunakan runner Phase 4/5 untuk artefak ini.

{inventory}

Port yang diverifikasi melalui vhost: central 3470; Lamariva 3035; Itinerary 3015; VoltLab 3025; Files 3480; Play leaderboard 3488. Vhost Play juga memproxy layanan game lain pada 3491: di luar perubahan ini dan tidak direstart. Rincian PID, source, konfigurasi vhost/SSL dan credential presence ada di inventory.json; certificate public metadata di certificates.json. Tidak ada private key dicetak/disalin ke release.

Artefak immutable review: {w}/releases/<app>/source.tar.gz + manifest.json. Manifest memuat file membership dan SHA256 setiap source serta archive; tidak mengandung env, key, data, node_modules, .next atau symlink. Hasil build tersimpan sebagai bukti, bundle runtime perlu dibangun ulang di direktori release terpisah dengan konfigurasi deployment yang telah disetujui. Jangan menjalankan build atau npm install pada direktori live. Jalankan npm ci pada aplikasi dan sso masing-masing, Prisma generate/build Lamariva, Next build VoltLab. Dependency runtime OIDC mempunyai lockfile sendiri.

Issuer kandidat persis https://eco.febro.id/profile. Endpoint protokol ditemukan melalui discovery; jangan memangkas path issuer. Produksi saat ini masih mengumumkan issuer legacy; namespace identitas berbeda.

Callback calon produksi, belum dinyatakan terdaftar/aktif:

| RP | Callback | Post logout |
|---|---|---|
| Lamariva | https://cv.febro.id/auth/febro/callback | https://cv.febro.id/auth/febro/logged-out |
| Itinerary | https://itinerary.febro.id/auth/space/callback | https://itinerary.febro.id/auth/space/logged-out |
| VoltLab | https://voltlab.febro.id/api/auth/febro/callback | https://voltlab.febro.id/api/auth/febro/logged-out |
| Files | https://files.febro.id/auth/febro/callback | https://files.febro.id/auth/febro/logged-out |
| Play | https://play.febro.id/api/leaderboard/auth/callback | https://play.febro.id/api/leaderboard/auth/febro/logged-out |

Staging harus menggunakan origin terpisah yang disetujui dengan path identik. Set FEBRO_DEPLOYMENT_ENV=staging untuk pusat, issuer/data directory/BASE_DOMAIN konsisten, dan NODE_ENV=production. FEBRO_SSO_TEST_ONLY dilarang di produksi. Lima RP memakai FEBRO_SSO_ENABLED, FEBRO_SSO_ISSUER, FEBRO_SSO_CLIENT_ID dan FEBRO_SSO_CLIENT_SECRET, origin aplikasi dan DB lokal terpisah. Jangan menyalin Google atau secret live ke fixture.

Urutan setelah gate/approval: verifikasi manifest dan drift/backup terbaru; siapkan release di luar live; jalankan migrasi tambahan yang ditinjau dengan backup dan mapping typed FK ke ID asli (tidak mengubah tabel bisnis); provider dahulu lalu satu RP setiap kali. Review migration sso/migrate-approved.mjs sebelum menjalankan; tidak dijalankan terhadap database produksi pada tugas ini. Catat release path dan configuration digest sebelum switch. Aktifkan hanya service aplikasi yang disetujui. Nginx hanya host terkait dan hanya setelah nginx -t serta approval; jangan hapus subdomain lama.

Sesudah masing-masing aplikasi: health, Google/SSO, login lama, permission/ownership, bisnis inti/Guest, DB integrity dan log sanitizer. Bila gagal, hentikan rollout berikutnya dan jalankan rollback source-only aplikasi tersebut. Tidak restore snapshot DB lama di atas data pengguna baru.

Pemeriksaan review aman: node {w}/scripts/deployment-gates.mjs {e}/gates.json. Hasil yang diharapkan saat ini BLOCKED, exit 1, activationPerformed=false. Checker memvalidasi keberadaan/checksum bukti, bukan keaslian approval atau isi acceptance; operator wajib review. Tidak ada fungsi switch/restart di checker.

HTTPS yang diperiksa: https://eco.febro.id, https://cv.febro.id, https://itinerary.febro.id, https://voltlab.febro.id, https://files.febro.id, https://play.febro.id → 200 versi lama. Public auth-checks.json mencatat mismatch issuer/callback. Bukan acceptance release Phase 6.
''')
rollback='''# Rollback per aplikasi

Tidak ada deployment produksi dalam Phase 6 ini; saat ini tidak ada perubahan live yang perlu di-rollback. Rehearsal fixture source-only lulus, tiga PostgreSQL/tiga SQLite/enam source archive direstore privat dan diverifikasi. Restore cluster telah dihentikan. Backup sumber sebelum tugas tercatat di evidence/backup-path; backup baru wajib dibuat lagi tepat sebelum aktivasi kelak.

Aturan umum: sebelum switch simpan path release sebelumnya, checksum source/config, status proses, versi dependency dan backup terbaru. Siapkan prior source/dependency di direktori release terpisah. Bila health/auth/permission/DB/log gagal sesudah rollout, kembalikan release source dan konfigurasi hanya aplikasi yang terpengaruh, restart hanya service itu, ulangi health dan login lama. Hapus tambahan source hanya jika manifest membuktikan dibuat rollout dan checksum tidak berubah; jangan menghapus file yang tidak dikenal.

| Aplikasi | Target rollback dan validasi |
|---|---|
| Febro Space | PM2 febro-ecosystem, /opt/febro-ecosystem. Kembalikan source/dependency/env delta yang telah disetujui; nonaktifkan provider baru bila diperlukan tanpa menghapus signing keys/provider DB; cek login lama, Google lama, users.id dan layanan tools. Tabel tambahan preferences/session_authentication aman dibiarkan untuk review, jangan drop data. |
| Lamariva | PM2 lamariva, /opt/lamariva. Kembalikan source + prior Next bundle/dependency, flag SSO delta. Cek sesi better-auth, CV/document/Profile/Application/SavedJob userId dan renderer/upload. Jangan restore database lama atau menghapus link. |
| Itinerary | systemd ls-itinerary.service, /opt/ls_itinerary. Hanya operator yang berwenang mengembalikan source/env delta dan restart unit ini. Cek login password/OIDC legacy, trip owner/member/role. Jangan membuat proses PM2 baru. |
| VoltLab | PM2 voltlab, /opt/voltlab. Kembalikan source + prior Next bundle/dependency, flag SSO delta; cek login lama, admin isolation, workspace/proyek/learning progress. |
| Files | PM2 febro-files, /opt/febro-files. Kembalikan source/dependency/flag SSO delta; cek akun sub asli, file/folder/share/download/quota/permissions dan vault integrity. Vault/data tidak diganti. |
| Play | PM2 febro-arcade-api, /opt/play/services/leaderboard dan hanya public asset yang berubah menurut manifest. Kembalikan source/flag delta, cek Guest, run finish, leaderboard/player ID. Jangan sentuh layanan game 3491 atau hapus/merge runs/bests/players. |

Jangan menyalin seluruh backup source di atas live secara membabi-buta: archive menyertakan konfigurasi privat lama. Bandingkan manifest delta; kembalikan hanya file yang disetujui. Tidak rollback database secara otomatis, tidak menghapus akun/link/score baru. Bila rollback butuh perubahan data, hentikan dan siapkan rencana pemulihan operator yang terpisah. Pertahankan keys serta provider state untuk investigasi, jangan regenerasi atau rotasi key sebagai efek rollback.

Rehearsal: python3 phase6/scripts/isolated-rollback.py. Script hanya memodifikasi fixture temporernya sendiri. Evidence source-restore-results.json, restore-results.json, preservation.json, assets-verification.json, rollback-rehearsal.json.
'''
(out/'ROLLBACK.md').write_text(rollback)
for name in ['STATUS.md','DEPLOYMENT.md','TEST_RESULTS.md','BLOCKERS.md','ROLLBACK.md','CLEANUP_MANIFEST.md']:
 assert (out/name).stat().st_size>0
print(json.dumps({'uniqueTestsPassed':total,'reports':str(out),'production':'NOT_ACTIVATED'}))
