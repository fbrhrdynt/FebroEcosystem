> ARSIP versi 0.2. Informasi fitur dan hasil tes pada dokumen ini belum diperbarui untuk versi 0.3; lihat README.md dan RELEASE-NOTES-v0.3.md.

# Audit konten

Versi dataset 1. 304 seed kuis, 5 set memory, cerita 7 node. Hitungan, jawaban, dan cabang cerita divalidasi otomatis.

- R01: 26 nama huruf Indonesia, bukan phonics. Be/ce/de dst. untuk nama huruf. Q memakai asosiasi “Quran”; V “vas”, X “xilofon”, Y “yoyo” adalah kosakata kurang familier/pinjaman dan perlu pendampingan. Asosiasi saat ini teks; 26 ilustrasi asosiasi khusus belum dibuat. Jangan menganggap anak telah membaca hanya karena cocok bentuk.
- R05: 20 suku kata terbuka BA/BI/BU/BE/BO, MA…, PA…, SA…. Voice sistem untuk “e” dapat bervariasi; belum ada rekaman fonetik terverifikasi.
- R07: 20 kata sehari-hari dan SVG bernama sama. Beberapa kata (kucing/kelinci dalam English, bukan R07) lebih panjang; kegiatan dimaksudkan sebagai pengenalan dengan pendamping, bukan tes formal.
- M01: 0 adalah angka nol, tidak memakai objek semu. M02 hanya 1–10 benda. M06 hanya bilangan bulat positif dengan hasil sampai 10. L1 maksimal 5 termasuk angka pengalih.
- E03: 10 warna, selalu ada nama Indonesia dan English. Warna digital ilustratif; jangan dipakai sebagai tes buta warna.
- E04: cat/dog/bird/fish/cow/lion/rabbit/duck/elephant/turtle/butterfly/horse, ilustrasi konsisten.
- H01: 28 huruf inti Unicode terpisah, RTL/lang ar. Hamzah dan lam-alif tidak dimasukkan. Ha ح dan ha ه dibedakan dalam label dataset untuk alias; tidak ada klaim pelafalan Arab, harakat, atau bentuk sambung.
- G01: berisi pasangan visual nyata, tanpa penghukuman waktu/skor. Kartu salah tidak otomatis ditutup agar anak punya waktu mengamati.
- R10: dua pilihan aman di setiap simpul, tidak meminta interaksi dengan hewan/objek berbahaya, ada konteks pendamping saat cuci tangan.

Semua ilustrasi edukasi berupa SVG lokal yang dibuat khusus aplikasi. Aset karikatur adalah aset dari pengguna; hak pengguna atas gambar tidak diubah. Tidak ada stok foto anak atau font jaringan. Teks konten telah diperiksa secara implementasi, **belum direview ahli pedagogi atau pengajar hijaiyah**. Tidak ada penilaian klinis kemampuan anak.

## Tambahan v0.2.0

R02 pasang bentuk huruf; R03 nama huruf awal, bukan latihan phonics; R04 lima vokal. M03 menyelaraskan angka dengan jumlah SVG apel; M07 apel diambil ditandai silang dan sisa tetap dapat dihitung, termasuk nol. E02 angka Inggris 1–10. S02 enam bentuk dasar. S04 pola warna A-B-A dengan kelanjutan B, disertai label.

Video animasi dibuat lokal, tanpa footage pihak ketiga: V01 2/3/4 apel, V02 merah/biru/kuning, V03 lingkaran/persegi/segitiga. Manifest mengaitkan tiap klip dengan soal yang sesuai; kecocokan itu diuji otomatis. Angka objek dan sisi bentuk dipilih untuk ketepatan konsep. Tidak ada musik/rekaman suara di MP4; narasi browser hanya bila tersedia. Film Ghaffi berbicara, lip-sync, dan video pengajaran kompleks belum dibuat.
