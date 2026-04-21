'use client'

import { useEffect, useRef, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { Produk, ProdukColi, ProdukVarian, Cabang, generateBarcodeColi } from '@/lib/types'
import { BarcodeLabel } from '@/components/BarcodeLabel'
import Toast, { useToast } from '@/components/Toast'
import { Printer, Package, Layers, Download, CheckCircle2, Building2, Palette } from 'lucide-react'
import { useReactToPrint } from 'react-to-print'

interface PrintItem {
  barcode: string
  produk: Produk
  coli: ProdukColi
  varian: ProdukVarian | null
  cabang: Cabang | null
  batch: string
}

export default function CetakColiPage() {
  const [produkList, setProdukList]     = useState<Produk[]>([])
  const [cabangList, setCabangList]     = useState<Cabang[]>([])
  const [selectedProduk, setSelectedProduk] = useState('')
  const [selectedCabang, setSelectedCabang] = useState('')
  const [selectedVarian, setSelectedVarian] = useState('')
  const [coliList, setColiList]         = useState<ProdukColi[]>([])
  const [varianList, setVarianList]     = useState<ProdukVarian[]>([])
  const [selectedColi, setSelectedColi] = useState('all')
  const [qty, setQty]                   = useState(1)
  const [batch, setBatch]               = useState('')
  const [printItems, setPrintItems]     = useState<PrintItem[]>([])
  const [loading, setLoading]           = useState(false)
  const [saved, setSaved]               = useState(false)
  const printRef = useRef<HTMLDivElement>(null)
  const { toasts, addToast, removeToast } = useToast()
  const handlePrint = useReactToPrint({ contentRef: printRef })

  useEffect(() => {
    const today = new Date()
    setBatch(`${today.getFullYear()}${String(today.getMonth() + 1).padStart(2, '0')}${String(today.getDate()).padStart(2, '0')}`)
    supabase.from('produk').select('*, kategori_produk(nama)').order('nama_produk').then(({ data }) => setProdukList(data ?? []))
    supabase.from('cabang').select('*').eq('aktif', true).order('nama_cabang').then(({ data }) => setCabangList(data ?? []))
  }, [])

  useEffect(() => {
    setColiList([])
    setVarianList([])
    setSelectedColi('all')
    setSelectedVarian('')
    setPrintItems([])
    setSaved(false)
    if (selectedProduk) {
      supabase.from('produk_coli').select('*').eq('produk_id', selectedProduk).order('nomor_coli')
        .then(({ data }) => setColiList(data ?? []))
      supabase.from('produk_varian').select('*').eq('produk_id', selectedProduk).eq('aktif', true)
        .then(({ data }) => setVarianList(data ?? []))
    }
  }, [selectedProduk])

  async function generateBarcodes() {
    if (!selectedProduk || !batch) { addToast('error', 'Pilih produk dan isi batch'); return }
    setLoading(true)
    const produk = produkList.find((p) => p.id === selectedProduk)!
    const cabang = cabangList.find((c) => c.id === selectedCabang) ?? null
    const varian = varianList.find((v) => v.id === selectedVarian) ?? null
    const targetColi = selectedColi === 'all' ? coliList : coliList.filter((c) => c.id === selectedColi)

    const items: PrintItem[] = []
    let seq = 1
    for (let q = 0; q < qty; q++) {
      for (const coli of targetColi) {
        const barcode = generateBarcodeColi(batch, seq++)
        items.push({ barcode, produk, coli, varian, cabang, batch })
      }
    }

    setPrintItems(items)
    setSaved(false)
    setLoading(false)
    addToast('success', `${items.length} barcode siap dicetak`)
  }

  async function saveToDatabase() {
    if (printItems.length === 0) return
    setLoading(true)
    const rows = printItems.map((item) => ({
      barcode: item.barcode,
      produk_id: item.produk.id,
      produk_coli_id: item.coli.id,
      varian_id: item.varian?.id ?? null,
      cabang_id: item.cabang?.id ?? null,
      nomor_batch: item.batch,
      status: 'tersedia' as const,
    }))
    const { error } = await supabase.from('stok_coli').insert(rows)
    if (error) { addToast('error', error.message) }
    else { addToast('success', `${rows.length} coli disimpan ke stok`); setSaved(true) }
    setLoading(false)
  }

  const totalLabel = qty * (selectedColi === 'all' ? coliList.length : 1)

  return (
    <>
      <div className="topbar">
        <div>
          <div className="topbar-title">Cetak Barcode Coli</div>
          <div className="topbar-breadcrumb">Generate label barcode untuk tiap pecahan produk per cabang & varian</div>
        </div>
      </div>

      <div className="page-content">
        <Toast toasts={toasts} onRemove={removeToast} />

        <div style={{ display: 'grid', gridTemplateColumns: '380px 1fr', gap: '24px', alignItems: 'start' }}>
          {/* Settings */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <div className="card">
              <div className="card-header">
                <div className="card-title"><Package size={16} /> Konfigurasi</div>
              </div>
              <div className="card-body" style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                {/* Produk */}
                <div className="form-group">
                  <label className="form-label">Pilih Produk *</label>
                  <select className="form-select" value={selectedProduk} onChange={(e) => setSelectedProduk(e.target.value)}>
                    <option value="">— Pilih produk —</option>
                    {produkList.map((p) => <option key={p.id} value={p.id}>[{p.kode_produk}] {p.nama_produk}</option>)}
                  </select>
                </div>

                {/* Cabang */}
                <div className="form-group">
                  <label className="form-label"><Building2 size={12} style={{ display: 'inline', marginRight: 4 }} />Cabang</label>
                  <select className="form-select" value={selectedCabang} onChange={(e) => setSelectedCabang(e.target.value)}>
                    <option value="">— Pilih cabang —</option>
                    {cabangList.map((c) => <option key={c.id} value={c.id}>[{c.kode_cabang}] {c.nama_cabang}</option>)}
                  </select>
                </div>

                {/* Varian */}
                {varianList.length > 0 && (
                  <div className="form-group">
                    <label className="form-label"><Palette size={12} style={{ display: 'inline', marginRight: 4 }} />Varian</label>
                    <select className="form-select" value={selectedVarian} onChange={(e) => setSelectedVarian(e.target.value)}>
                      <option value="">— Pilih varian (opsional) —</option>
                      {varianList.map((v) => <option key={v.id} value={v.id}>{v.tipe_varian ? `[${v.tipe_varian}] ` : ''}{v.nama_varian}</option>)}
                    </select>
                  </div>
                )}

                {/* Coli target */}
                {coliList.length > 0 && (
                  <div className="form-group">
                    <label className="form-label">Coli yang Dicetak</label>
                    <select className="form-select" value={selectedColi} onChange={(e) => setSelectedColi(e.target.value)}>
                      <option value="all">Semua Coli ({coliList.length})</option>
                      {coliList.map((c) => <option key={c.id} value={c.id}>Coli {c.nomor_coli}: {c.nama_coli}</option>)}
                    </select>
                  </div>
                )}

                <div className="form-grid form-grid-2">
                  <div className="form-group">
                    <label className="form-label">Nomor Batch *</label>
                    <input className="form-input font-mono" placeholder="20250120" value={batch}
                      onChange={(e) => setBatch(e.target.value)} />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Jumlah Set</label>
                    <input type="number" className="form-input" min={1} max={100} value={qty}
                      onChange={(e) => setQty(Number(e.target.value))} />
                  </div>
                </div>

                <div style={{ fontSize: '12px', color: 'var(--text-muted)', padding: '8px 12px', background: 'var(--bg-input)', borderRadius: 6 }}>
                  Total label: <strong style={{ color: 'var(--primary)' }}>{qty} × {selectedColi === 'all' ? coliList.length : 1} = {totalLabel}</strong>
                </div>

                <button onClick={generateBarcodes} disabled={!selectedProduk || loading} className="btn btn-primary w-full">
                  <Layers size={16} /> Generate Barcode
                </button>

                {printItems.length > 0 && (
                  <>
                    <hr className="divider" />
                    <button onClick={saveToDatabase} disabled={loading || saved} className={`btn w-full ${saved ? 'btn-secondary' : 'btn-success'}`}>
                      {saved ? <><CheckCircle2 size={15} /> Tersimpan ke Stok</> : <><Download size={15} /> Simpan ke Stok Coli</>}
                    </button>
                    <button onClick={() => handlePrint()} className="btn btn-secondary w-full">
                      <Printer size={15} /> Cetak Label
                    </button>
                  </>
                )}
              </div>
            </div>

            {/* Coli info */}
            {coliList.length > 0 && (
              <div className="card">
                <div className="card-header"><div className="card-title"><Layers size={14} /> Coli Produk</div></div>
                <div className="card-body">
                  <div className="coli-grid">
                    {coliList.map((c) => (
                      <div key={c.id} className="coli-item">
                        <div className="coli-number">{c.nomor_coli}</div>
                        <div>
                          <div style={{ fontWeight: 600, fontSize: '13px' }}>{c.nama_coli}</div>
                          {c.berat_kg && <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>{c.berat_kg} kg</div>}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Preview */}
          <div>
            {printItems.length === 0 ? (
              <div className="card">
                <div className="empty-state" style={{ padding: '80px 24px' }}>
                  <div className="empty-icon"><Printer size={32} /></div>
                  <div className="empty-title">Preview Barcode</div>
                  <div className="empty-desc">Pilih produk, cabang & varian lalu klik Generate Barcode</div>
                </div>
              </div>
            ) : (
              <div className="card">
                <div className="card-header">
                  <div className="card-title"><Printer size={16} /> Preview — {printItems.length} Label</div>
                  <button onClick={() => handlePrint()} className="btn btn-primary btn-sm"><Printer size={14} /> Cetak</button>
                </div>
                <div className="card-body" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(250px, 1fr))', gap: 12 }}>
                  {printItems.map((item, i) => (
                    <BarcodeLabel key={i} barcode={item.barcode}
                      title={item.produk.nama_produk}
                      subtitle={[`Coli ${item.coli.nomor_coli}: ${item.coli.nama_coli}`, item.varian?.nama_varian].filter(Boolean).join(' · ')}
                      extra={[item.cabang?.nama_cabang ? `Cabang: ${item.cabang.nama_cabang}` : null, `Batch: ${item.batch}`].filter(Boolean).join(' | ')}
                      type="coli" />
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Print hidden */}
      <div style={{ display: 'none' }}>
        <div ref={printRef} style={{ padding: '10mm', display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '5mm' }}>
          {printItems.map((item, i) => (
            <div key={i} style={{ pageBreakInside: 'avoid' }}>
              <BarcodeLabel barcode={item.barcode}
                title={item.produk.nama_produk}
                subtitle={[`Coli ${item.coli.nomor_coli}: ${item.coli.nama_coli}`, item.varian?.nama_varian].filter(Boolean).join(' · ')}
                extra={[item.cabang?.nama_cabang, `Batch: ${item.batch}`].filter(Boolean).join(' | ')}
                type="coli" />
            </div>
          ))}
        </div>
      </div>
    </>
  )
}
