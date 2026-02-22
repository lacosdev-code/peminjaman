# PWA Peminjaman (Technician Portal) - PT. Sunggiardi 🚀

Sistem PWA (Technician Portal) untuk PT. Sunggiardi. Berfungsi sebagai frontend operasional lapangan untuk memproses peminjaman dan pengembalian alat secara real-time. Terkoneksi ke Shared Supabase Database yang sama dengan Admin Dashboard.

## 🏗️ Struktur Arsitektur
Sistem ini menggunakan arsitektur **"1 Database, 2 Frontends, 2 Github"**:

| Komponen | Repository Github | Peran Utama |
| :--- | :--- | :--- |
| **Admin Web** | `sgd-inventaris-management` | Manajemen Master Data, Approval, & Laporan (PDF/Excel) |
| **PWA Peminjaman** | `peminjaman` | Operasional Teknisi, Scan QR, & Laporan Kondisi Lapangan |
| **Database** | (Supabase Shared) | Sumber kebenaran data tunggal untuk kedua frontend |

## 🛠️ Aturan Main Berbagi Database
1. **log_tool_handover**: CRUD utama (Peminjaman/Pengembalian) di PWA ini harus memanggil RPC `log_tool_handover` agar sinkron dengan Admin.
2. **UX Lapangan**: PWA fokus pada Mobile-first, QR Scan, dan Upload Foto bukti.
3. **Data Source**: Data teknisi diambil dari tabel `technicians`, dan status pinjaman diambil dari tabel `peminjaman`.

## 🚀 Development

```bash
npm run dev
```

## 📦 Push to GitHub
```bash
git add .
git commit -m "Your description"
git push origin main
```
*(GitHub: https://github.com/lacosdev-code/peminjaman.git)*
