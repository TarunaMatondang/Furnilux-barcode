# BARCODE-SYS — Sistem Stock Opname Gudang

## ✅ Setup Cepat

### 1. Isi environment variables
Edit file `.env.local` dan ganti dengan URL Supabase project Anda:

```env
NEXT_PUBLIC_SUPABASE_URL=https://xxxxxxxxxxxxxxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key-here
```

Dapatkan URL dan Key dari: **Supabase Dashboard → Project Settings → API**

---

### 2. Buat tabel di Supabase
Buka **Supabase Dashboard → SQL Editor**, copy-paste seluruh isi file `database.sql` dan jalankan.

---

### 3. Jalankan aplikasi
```bash
npm run dev
```

Buka [http://localhost:3000](http://localhost:3000)

---

## 📋 Struktur Database

| Tabel | Fungsi |
|-------|--------|
| `produk` | Master produk (nama, kode, jumlah coli) |
| `produk_coli` | Definisi pecahan/coli per produk |
| `stok_coli` | Item coli fisik di gudang (punya barcode) |
| `stok_pasang` | Set lengkap (semua coli terkumpul) |
| `stok_unit` | Produk rakitan (barcode akhir) |
| `opname_sesi` | Sesi stock opname |
| `opname_scan` | Log scan barcode per sesi |

---

## 🔄 Alur Kerja

```
1. Definisi Produk + Coli
   → Tambah produk (e.g. "Meja Makan 4 Kursi", total_coli = 3)
   → Definisi coli: Coli 1 = Daun Meja, Coli 2 = 4 Kursi, Coli 3 = Kaki Meja

2. Cetak Barcode Coli
   → /barcode/cetak-coli
   → Pilih produk, isi batch, generate → simpan ke stok → cetak label

3. Stock Opname (Scan Coli)
   → /opname → Buat sesi baru
   → Buka sesi → Scan barcode coli satu per satu
   → Ketika semua coli 1 produk lengkap → otomatis terbentuk PASANG
   → Cetak barcode pasang

4. Rakit ke Unit
   → /stok/pasang → Klik "Rakit → Unit"
   → Unit barcode tergenerate
   → Cetak label unit dan tempel di produk rakitan

5. Distribusi
   → /stok/unit → Tandai "Keluar" saat produk keluar gudang
```

---

## 📁 Struktur Project

```
src/
├── app/
│   ├── page.tsx              # Dashboard
│   ├── produk/page.tsx       # Master produk & coli
│   ├── barcode/
│   │   ├── cetak-coli/       # Cetak barcode coli
│   │   └── cetak-unit/       # Cetak barcode unit
│   ├── opname/
│   │   ├── page.tsx          # Daftar sesi
│   │   └── [id]/page.tsx     # Sesi scan aktif
│   └── stok/
│       ├── page.tsx          # Ringkasan stok
│       ├── coli/page.tsx     # Stok coli
│       ├── pasang/page.tsx   # Stok pasang
│       └── unit/page.tsx     # Stok unit
├── components/
│   ├── Sidebar.tsx
│   ├── Toast.tsx
│   └── BarcodeLabel.tsx
└── lib/
    ├── supabase.ts
    └── types.ts
```

---

## 🖨️ Format Barcode

- **Coli**: `CLB-XXXXX-BATCH-N` (prefix CLB)  
- **Pasang**: `PSG-XXXXX-XXXX` (prefix PSG)  
- **Unit**: `UNT-XXXXX-XXXX` (prefix UNT)

Scanner barcode USB/Bluetooth (keyboard wedge) langsung bisa dipakai — input akan otomatis masuk ke field scan.
