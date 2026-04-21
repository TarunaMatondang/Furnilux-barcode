// ============================================
// DATABASE TYPES
// ============================================

export interface Cabang {
  id: string
  kode_cabang: string
  nama_cabang: string
  alamat: string | null
  kota: string | null
  aktif: boolean
  created_at: string
}

export interface KategoriProduk {
  id: string
  nama: string
  deskripsi: string | null
  created_at: string
}

export interface Produk {
  id: string
  kode_produk: string
  nama_produk: string
  kategori_id: string | null
  satuan: string
  total_coli: number
  deskripsi: string | null
  created_at: string
  // joined
  kategori_produk?: KategoriProduk
}

export interface ProdukVarian {
  id: string
  produk_id: string
  kode_varian: string
  nama_varian: string
  tipe_varian: string | null
  aktif: boolean
  created_at: string
}

export interface ProdukColi {
  id: string
  produk_id: string
  nomor_coli: number
  nama_coli: string
  berat_kg: number | null
  keterangan: string | null
  created_at: string
}

export interface StokColi {
  id: string
  barcode: string
  produk_id: string
  produk_coli_id: string
  varian_id: string | null
  cabang_id: string | null
  nomor_batch: string | null
  status: 'tersedia' | 'dipasangkan' | 'rusak' | 'keluar'
  pasang_id: string | null
  lokasi: string | null
  created_at: string
  // joined
  produk?: Produk
  produk_coli?: ProdukColi
  varian?: ProdukVarian
  cabang?: Cabang
}

export interface StokPasang {
  id: string
  barcode: string
  produk_id: string
  varian_id: string | null
  cabang_id: string | null
  status: 'tersedia' | 'dirakit' | 'keluar'
  unit_id: string | null
  created_at: string
  // joined
  produk?: Produk
  varian?: ProdukVarian
  cabang?: Cabang
  coli_items?: StokColi[]
}

export interface StokUnit {
  id: string
  barcode: string
  produk_id: string
  varian_id: string | null
  cabang_id: string | null
  pasang_id: string
  status: 'tersedia' | 'keluar' | 'rusak'
  lokasi: string | null
  assembled_at: string
  created_at: string
  // joined
  produk?: Produk
  varian?: ProdukVarian
  cabang?: Cabang
  pasang?: StokPasang
}

export interface OpnameSesi {
  id: string
  nama_sesi: string
  cabang_id: string | null
  tanggal: string
  status: 'aktif' | 'selesai'
  catatan: string | null
  created_at: string
  // joined
  cabang?: Cabang
}

export interface OpnameScan {
  id: string
  sesi_id: string
  barcode: string
  tipe: 'coli' | 'pasang' | 'unit'
  referensi_id: string | null
  produk_id: string | null
  produk_coli_id: string | null
  varian_id: string | null
  scanned_at: string
  // joined
  produk?: Produk
  produk_coli?: ProdukColi
  varian?: ProdukVarian
}

// ============================================
// BARCODE GENERATORS
// ============================================

export function generateBarcodeColi(batch: string, seq: number): string {
  const ts = Date.now().toString(36).toUpperCase().slice(-4)
  return `CLB-${batch.slice(-6)}-${ts}-${String(seq).padStart(3, '0')}`
}

export function generateBarcodePasang(): string {
  const ts = Date.now().toString(36).toUpperCase()
  const rand = Math.random().toString(36).slice(2, 6).toUpperCase()
  return `PSG-${ts}-${rand}`
}

export function generateBarcodeUnit(): string {
  const ts = Date.now().toString(36).toUpperCase()
  const rand = Math.random().toString(36).slice(2, 6).toUpperCase()
  return `UNT-${ts}-${rand}`
}

// ============================================
// STATUS LABELS & COLORS
// ============================================

export const STATUS_COLI_LABEL: Record<string, string> = {
  tersedia: 'Tersedia',
  dipasangkan: 'Dipasangkan',
  rusak: 'Rusak',
  keluar: 'Keluar',
}

export const STATUS_PASANG_LABEL: Record<string, string> = {
  tersedia: 'Tersedia',
  dirakit: 'Dirakit',
  keluar: 'Keluar',
}

export const STATUS_UNIT_LABEL: Record<string, string> = {
  tersedia: 'Tersedia',
  keluar: 'Keluar',
  rusak: 'Rusak',
}

export const STATUS_BADGE: Record<string, string> = {
  tersedia: 'badge badge-green',
  dipasangkan: 'badge badge-blue',
  dirakit: 'badge badge-blue',
  keluar: 'badge badge-purple',
  rusak: 'badge badge-red',
  aktif: 'badge badge-green',
  selesai: 'badge badge-gray',
}
