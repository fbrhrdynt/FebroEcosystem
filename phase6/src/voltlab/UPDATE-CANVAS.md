# Pembaruan canvas panel — VoltLab by Febro Herdyanto 2.4.1

Paket 2.4.1 memperbaiki hubungan visual kabel pada terminal komponen. Di tampilan Panel dan Fisik, titik klik dan ujung wire disejajarkan dengan kepala baut yang digambar pada sumber, MCB/MCCB, fuse, contactor, relay, overload, tombol, lampu dan terminal block. Rute serta label kabel disebar agar tidak menumpuk pada satu bend X. Posisi tetap mengikuti rotasi perangkat.

Pembaruan ini menyempurnakan mode **Panel** agar terasa seperti tata letak panel listrik fisik: pelat belakang kabinet, title strip, duct kabel, DIN rail yang ditambahkan sebagai komponen mandiri dari kategori Mounting, perangkat vektor yang lebih besar, dan terminal yang lebih mudah dipilih. Wiring, simulasi, penyimpanan rangkaian, Google login dan database tetap memakai model yang sama. Ilustrasi adalah perangkat generik, bukan foto atau model CAD pabrikan. Komponen referensi tetap menggunakan baut terminal generik yang mengikuti posisi terminal dan ditampilkan langsung di atas perangkat.

## Update VPS yang sudah berjalan

1. Unduh ZIP pembaruan lalu upload ke home user Ubuntu yang menjalankan PM2 melalui WinSCP.
2. Di PuTTY, masuk sebagai user tersebut dan jalankan:

```bash
cd /opt/voltlab
pm2 stop voltlab
unzip -o ~/VoltLab-VPS-v2.4.1.zip -d /opt/voltlab
npm run build
pm2 restart voltlab
pm2 save
```

Jika `npm run build` gagal, jangan jalankan `pm2 restart`; kirimkan pesan error dari terminal. `.env` dan database tidak termasuk di ZIP, jadi kredensial Google serta data pengguna tetap di server. Pembaruan ini tidak memerlukan `npm ci` atau migrasi database karena dependensi dan skema tidak berubah.

Buka kembali VoltLab lalu pilih tampilan **Panel** di toolbar Simulator. Refresh halaman jika tampilan lama masih tersimpan di browser.
