-- ============================================
-- BARCODE STOCK OPNAME SYSTEM - DATABASE SCHEMA
-- Jalankan query berikut di Supabase SQL Editor
-- ============================================

-- 0. Tabel Cabang
CREATE TABLE IF NOT EXISTS cabang (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  kode_cabang TEXT UNIQUE NOT NULL,
  nama_cabang TEXT NOT NULL,
  alamat TEXT,
  kota TEXT,
  aktif BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 1. Tabel Kategori Produk
CREATE TABLE IF NOT EXISTS kategori_produk (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  nama TEXT UNIQUE NOT NULL,
  deskripsi TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Tabel Produk (Master - tanpa cabang)
CREATE TABLE IF NOT EXISTS produk (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  kode_produk TEXT UNIQUE NOT NULL,
  nama_produk TEXT NOT NULL,
  kategori_id UUID REFERENCES kategori_produk(id) ON DELETE SET NULL,
  satuan TEXT DEFAULT 'unit',
  total_coli INTEGER NOT NULL DEFAULT 1,
  deskripsi TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Tabel Varian Produk (warna, ukuran, dll)
CREATE TABLE IF NOT EXISTS produk_varian (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  produk_id UUID REFERENCES produk(id) ON DELETE CASCADE,
  kode_varian TEXT NOT NULL,
  nama_varian TEXT NOT NULL,   -- e.g. "Merah", "120cm x 60cm"
  tipe_varian TEXT,             -- e.g. "Warna", "Ukuran"
  aktif BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(produk_id, kode_varian)
);

-- 4. Tabel Produk Coli (Definisi pecahan per produk - berlaku semua varian)
CREATE TABLE IF NOT EXISTS produk_coli (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  produk_id UUID REFERENCES produk(id) ON DELETE CASCADE,
  nomor_coli INTEGER NOT NULL,
  nama_coli TEXT NOT NULL,
  berat_kg DECIMAL(10,2),
  keterangan TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(produk_id, nomor_coli)
);

-- 5. Tabel Stok Coli (Item coli fisik - per cabang, per varian)
CREATE TABLE IF NOT EXISTS stok_coli (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  barcode TEXT UNIQUE NOT NULL,
  produk_id UUID REFERENCES produk(id),
  produk_coli_id UUID REFERENCES produk_coli(id),
  varian_id UUID REFERENCES produk_varian(id) ON DELETE SET NULL,
  cabang_id UUID REFERENCES cabang(id) ON DELETE SET NULL,
  nomor_batch TEXT,
  status TEXT DEFAULT 'tersedia' CHECK (status IN ('tersedia', 'dipasangkan', 'rusak', 'keluar')),
  pasang_id UUID,
  lokasi TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 6. Tabel Stok Pasang (Set lengkap - per cabang, per varian)
CREATE TABLE IF NOT EXISTS stok_pasang (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  barcode TEXT UNIQUE NOT NULL,
  produk_id UUID REFERENCES produk(id),
  varian_id UUID REFERENCES produk_varian(id) ON DELETE SET NULL,
  cabang_id UUID REFERENCES cabang(id) ON DELETE SET NULL,
  status TEXT DEFAULT 'tersedia' CHECK (status IN ('tersedia', 'dirakit', 'keluar')),
  unit_id UUID,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- FK pasang_id di stok_coli
ALTER TABLE stok_coli
  ADD CONSTRAINT fk_stok_coli_pasang
  FOREIGN KEY (pasang_id) REFERENCES stok_pasang(id)
  ON DELETE SET NULL;

-- 7. Tabel Stok Unit (Produk rakitan - per cabang, per varian)
CREATE TABLE IF NOT EXISTS stok_unit (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  barcode TEXT UNIQUE NOT NULL,
  produk_id UUID REFERENCES produk(id),
  varian_id UUID REFERENCES produk_varian(id) ON DELETE SET NULL,
  cabang_id UUID REFERENCES cabang(id) ON DELETE SET NULL,
  pasang_id UUID REFERENCES stok_pasang(id),
  status TEXT DEFAULT 'tersedia' CHECK (status IN ('tersedia', 'keluar', 'rusak')),
  lokasi TEXT,
  assembled_at TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- FK unit_id di stok_pasang
ALTER TABLE stok_pasang
  ADD CONSTRAINT fk_stok_pasang_unit
  FOREIGN KEY (unit_id) REFERENCES stok_unit(id)
  ON DELETE SET NULL;

-- 8. Tabel Opname Sesi (per cabang)
CREATE TABLE IF NOT EXISTS opname_sesi (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  nama_sesi TEXT NOT NULL,
  cabang_id UUID REFERENCES cabang(id) ON DELETE SET NULL,
  tanggal DATE DEFAULT CURRENT_DATE,
  status TEXT DEFAULT 'aktif' CHECK (status IN ('aktif', 'selesai')),
  catatan TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 9. Tabel Opname Scan (Log scan per sesi)
CREATE TABLE IF NOT EXISTS opname_scan (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  sesi_id UUID REFERENCES opname_sesi(id) ON DELETE CASCADE,
  barcode TEXT NOT NULL,
  tipe TEXT CHECK (tipe IN ('coli', 'pasang', 'unit')),
  referensi_id UUID,
  produk_id UUID REFERENCES produk(id) ON DELETE SET NULL,
  produk_coli_id UUID REFERENCES produk_coli(id) ON DELETE SET NULL,
  varian_id UUID REFERENCES produk_varian(id) ON DELETE SET NULL,
  scanned_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- INDEX
-- ============================================
CREATE INDEX IF NOT EXISTS idx_stok_coli_produk   ON stok_coli(produk_id);
CREATE INDEX IF NOT EXISTS idx_stok_coli_barcode  ON stok_coli(barcode);
CREATE INDEX IF NOT EXISTS idx_stok_coli_status   ON stok_coli(status);
CREATE INDEX IF NOT EXISTS idx_stok_coli_cabang   ON stok_coli(cabang_id);
CREATE INDEX IF NOT EXISTS idx_stok_coli_varian   ON stok_coli(varian_id);
CREATE INDEX IF NOT EXISTS idx_stok_pasang_produk ON stok_pasang(produk_id);
CREATE INDEX IF NOT EXISTS idx_stok_pasang_cabang ON stok_pasang(cabang_id);
CREATE INDEX IF NOT EXISTS idx_stok_unit_produk   ON stok_unit(produk_id);
CREATE INDEX IF NOT EXISTS idx_stok_unit_cabang   ON stok_unit(cabang_id);
CREATE INDEX IF NOT EXISTS idx_opname_scan_sesi   ON opname_scan(sesi_id);
CREATE INDEX IF NOT EXISTS idx_opname_sesi_cabang ON opname_sesi(cabang_id);

-- ============================================
-- SAMPLE DATA
-- ============================================
INSERT INTO cabang (kode_cabang, nama_cabang, kota) VALUES
  ('CBG-01', 'Gudang Pusat', 'Jakarta'),
  ('CBG-02', 'Cabang Bandung', 'Bandung'),
  ('CBG-03', 'Cabang Surabaya', 'Surabaya');

INSERT INTO kategori_produk (nama) VALUES
  ('Meja Makan'), ('Kursi'), ('Lemari'), ('Tempat Tidur'),
  ('Sofa'), ('Meja Kerja'), ('Rak'), ('Lainnya');

INSERT INTO produk (kode_produk, nama_produk, satuan, total_coli) VALUES
  ('MM-001', 'Meja Makan 4 Kursi', 'set', 3),
  ('LM-001', 'Lemari 2 Pintu', 'unit', 2);

-- Varian untuk MM-001
INSERT INTO produk_varian (produk_id, kode_varian, nama_varian, tipe_varian)
SELECT id, 'MM-001-CKT', 'Cokelat Tua', 'Warna' FROM produk WHERE kode_produk = 'MM-001'
UNION ALL
SELECT id, 'MM-001-NAT', 'Natural', 'Warna' FROM produk WHERE kode_produk = 'MM-001'
UNION ALL
SELECT id, 'MM-001-PTH', 'Putih', 'Warna' FROM produk WHERE kode_produk = 'MM-001';

-- Coli MM-001
INSERT INTO produk_coli (produk_id, nomor_coli, nama_coli)
SELECT id, 1, 'Daun Meja' FROM produk WHERE kode_produk = 'MM-001'
UNION ALL
SELECT id, 2, '4 Kursi' FROM produk WHERE kode_produk = 'MM-001'
UNION ALL
SELECT id, 3, 'Kaki Meja' FROM produk WHERE kode_produk = 'MM-001';
