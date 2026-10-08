# Najib Learning Center

Folder ini berisi halaman publik dan media perkuliahan. Beranda berfungsi sebagai pengantar blog; penerbitan catatan pribadi dikelola di WordPress.

## GitHub Pages

Unggah **isi folder github-pages saja** ke repository publik `najib-learning-center`. Buka Settings → Pages, pilih Deploy from a branch, branch `main`, folder `/ (root)`, lalu Save. Tidak diperlukan layanan berbayar.

## Evaluasi

`data/*.json` hanya berisi ciphertext AES-GCM. HTML evaluasi asli, XML kunci, password, dan folder alat-admin tidak diunggah ke repository ini. Kunci dilepas oleh halaman WordPress yang dilindungi password. Entri awal memakai `accessConfigured: false` sampai integrasi WordPress diuji; status tetap Ditutup.

Setelah halaman akses dibuat dan uji akses berhasil, set `accessConfigured` menjadi `true` untuk entri yang bersangkutan pada catalog.json. Admin membuka dengan menerbitkan halaman AKSES EVALUASI yang tetap dilindungi password, dan menutup dengan mengembalikannya ke Draf. Jangan hilangkan password atau mengganti isi marker kunci. Penutupan membatasi akses baru, bukan menarik kembali isi yang sudah diunduh pengguna berizin.

## Catatan

WordPress menjadi tempat menulis artikel. Media dan evaluasi memiliki menu terpisah. Semua HTML materi tetap sama seperti berkas sumber; desain hitam/gold diterapkan pada portal, bukan memodifikasi isi media tersebut.
