# Penemuan dan baseline Phase 4

Tanggal: 22 Oktober 2026. Bukti mesin: `phase4/evidence/baseline.json`, `auth-config-presence.json`, `final-health.json`, dan `itinerary-service.json`.

Dokumen yang dibaca: SSO_ARCHITECTURE.md, SSO_AUDIT.md, SSO_DEPLOYMENT_PLAN.md, SSO_APPLICATION_MAPPING.md dan laporan implementasi/pengujian sebelumnya. SSO_PHASE3_PROGRESS.md, SSO_PHASE3_TEST_RESULTS.md dan SSO_PHASE3_DEPLOYMENT.md tidak ditemukan. Tidak mengarang hasil Phase 3. Kode provider, RP, penyimpanan, interaksi dan pengujian Phase 2 diperiksa sebelum perubahan.

| Aplikasi | Sumber produksi | Port loopback | Pengelola | Kunci kepemilikan asli |
|---|---|---:|---|---|
| Febro Space | /opt/febro-ecosystem | 3470 | PM2 febro-ecosystem | users.id; dokumen/snippet/link tetap terkait ID asli |
| Lamariva | /opt/lamariva | 3035 | PM2 lamariva | PostgreSQL user.id TEXT; Document/Profile/Application/SavedJob.userId |
| Itinerary | /opt/ls_itinerary | 3015 | **systemd ls-itinerary.service**, PID awal 1091 | PostgreSQL users.id bigint; trips.owner_id dan trip_members.user_id |
| VoltLab | /opt/voltlab | 3025 | PM2 voltlab | PostgreSQL users.id uuid; workspaces.owner_id |
| Files | **/opt/febro-files**, dibuktikan PM2 dan Nginx | 3480 | PM2 febro-files | SQLite accounts.sub; nodes.owner_sub dan share_links.owner_sub |
| Play | /opt/play/public dan services/leaderboard | 3488 | PM2 febro-arcade-api | SQLite players.id; runs/bests.player_id |

Tribeworld dan layanan di luar cakupan tidak diubah. Pemeriksaan Nginx hanya membaca vhost keenam layanan; tidak ada reload, perubahan DNS atau SSL.

Autentikasi awal: Lamariva memakai better-auth email/password/Google; Itinerary memakai OIDC lama dan pengaitan dengan password, sementara POST login password dinonaktifkan; VoltLab memakai Google serta password administrator; Files memakai OIDC lama dan sesi SQLite; Play memakai cookie pemain Guest. Provider lama berissuer https://auth.febro.id dipertahankan. Namespace issuer baru tidak disamakan meskipun sub kebetulan sama.

Temuan keamanan: trusted Google linking Lamariva dan pengaitan email VoltLab tidak boleh diteruskan dalam migrasi. Files membuang path issuer dalam verifier lama; alur baru memakai discovery/verifier pustaka tanpa mengubah autentikasi lama. Provider Google pusat sebelumnya belum memvalidasi nonce. Perbaikan tersedia pada **salinan staging**, bukan layanan aktif.

Konfigurasi Google/OIDC diperiksa sebagai nama variabel dan status terisi saja. Tidak ada nilai secret disalin ke laporan, tidak ada klaim bahwa kredensial Google telah diterima provider, dan tidak ada perubahan OAuth client produksi. Callback lama, pemulihan password, API aplikasi, undangan/perjalanan bersama, public shared links dan konsumen leaderboard Guest tetap dipertahankan.

Enam pemeriksaan HTTP loopback baseline memberi 200. Pemeriksaan akhir HTTPS publik dengan verifikasi sertifikat juga memberi 200 untuk keenam layanan **versi produksi yang sudah ada**; ini bukan penerimaan HTTPS integrasi baru. Checksum sumber baseline tersimpan per berkas; pemeriksaan akhir menunjukkan nol perubahan sumber produksi. PID PM2 dan systemd tetap sama.

Tidak ditemukan endpoint HTTPS staging yang sekaligus terbukti tersedia dan diotorisasi untuk integrasi ini. Semua pengujian baru memakai database sintetis dan listener loopback terpisah.
