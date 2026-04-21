'use client'

import { useEffect, useRef, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { StokPasang, Produk } from '@/lib/types'
import { BarcodeLabel } from '@/components/BarcodeLabel'
import Toast, { useToast } from '@/components/Toast'
import { Barcode, Printer, Search, CheckCircle2, Package } from 'lucide-react'
import { useReactToPrint } from 'react-to-print'

export default function CetakUnitPage() {
  const [produkList, setProdukList] = useState<Produk[]>([])
  const [selectedProduk, setSelectedProduk] = useState('')
  const [pasangList, setPasangList] = useState<StokPasang[]>([])
  const [selectedPasang, setSelectedPasang] = useState<string[]>([])
  const [loading, setLoading] = useState(false)
  const printRef = useRef<HTMLDivElement>(null)
  const { toasts, addToast, removeToast } = useToast()
  const handlePrint = useReactToPrint({ contentRef: printRef })

  useEffect(() => {
    async function fetchProduk() {
      const { data } = await supabase.from('produk').select('*').order('nama_produk')
      setProdukList(data ?? [])
    }
    fetchProduk()
  }, [])

  useEffect(() => {
    async function fetchPasang() {
      if (selectedProduk) {
        const { data } = await supabase
          .from('stok_pasang')
          .select('*, produk(nama_produk, kode_produk)')
          .eq('produk_id', selectedProduk)
          .eq('status', 'tersedia')
          .order('created_at', { ascending: false })
        
        setPasangList(data ?? [])
        setSelectedPasang([])
      } else {
        setPasangList([])
      }
    }
    fetchPasang()
  }, [selectedProduk])

  function toggleSelect(id: string) {
    setSelectedPasang((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    )
  }

  function selectAll() {
    if (selectedPasang.length === pasangList.length) {
      setSelectedPasang([])
    } else {
      setSelectedPasang(pasangList.map((p) => p.id))
    }
  }

  const printItems = pasangList.filter((p) => selectedPasang.includes(p.id))

  return (
    <>
      <div className="topbar">
        <div>
          <div className="topbar-title">Cetak Barcode Unit</div>
          <div className="topbar-breadcrumb">Cetak label barcode untuk pasang yang sudah lengkap coli-nya</div>
        </div>
      </div>

      <div className="page-content">
        <Toast toasts={toasts} onRemove={removeToast} />

        <div style={{ display: 'grid', gridTemplateColumns: '360px 1fr', gap: '24px', alignItems: 'start' }}>
          {/* Settings */}
          <div className="card">
            <div className="card-header">
              <div className="card-title"><Package size={16} /> Filter Pasang</div>
            </div>
            <div className="card-body" style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              <div className="form-group">
                <label className="form-label">Pilih Produk</label>
                <select
                  className="form-select"
                  value={selectedProduk}
                  onChange={(e) => setSelectedProduk(e.target.value)}
                >
                  <option value="">— Semua produk —</option>
                  {produkList.map((p) => (
                    <option key={p.id} value={p.id}>
                      [{p.kode_produk}] {p.nama_produk}
                    </option>
                  ))}
                </select>
              </div>

              {pasangList.length > 0 && (
                <>
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      fontSize: '13px',
                    }}
                  >
                    <span style={{ color: 'var(--text-secondary)' }}>
                      {pasangList.length} pasang tersedia
                    </span>
                    <button onClick={selectAll} className="btn btn-ghost btn-sm">
                      {selectedPasang.length === pasangList.length ? 'Batal Semua' : 'Pilih Semua'}
                    </button>
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: 6, maxHeight: 320, overflowY: 'auto' }}>
                    {pasangList.map((p) => {
                      const sel = selectedPasang.includes(p.id)
                      return (
                        <div
                          key={p.id}
                          onClick={() => toggleSelect(p.id)}
                          style={{
                            padding: '10px 12px',
                            borderRadius: 'var(--radius-sm)',
                            border: `1px solid ${sel ? 'rgba(79,127,255,0.5)' : 'var(--border)'}`,
                            background: sel ? 'var(--primary-glow)' : 'var(--bg-input)',
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            gap: 10,
                            transition: 'all 0.15s',
                          }}
                        >
                          <div
                            style={{
                              width: 18,
                              height: 18,
                              borderRadius: 4,
                              border: `2px solid ${sel ? 'var(--primary)' : 'var(--border-light)'}`,
                              background: sel ? 'var(--primary)' : 'transparent',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              flexShrink: 0,
                            }}
                          >
                            {sel && <CheckCircle2 size={12} color="white" />}
                          </div>
                          <div>
                            <div style={{ fontSize: '12px', fontFamily: 'monospace', color: 'var(--primary)', fontWeight: 600 }}>
                              {p.barcode}
                            </div>
                            <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                              {new Date(p.created_at).toLocaleDateString('id-ID')}
                            </div>
                          </div>
                        </div>
                      )
                    })}
                  </div>

                  {selectedPasang.length > 0 && (
                    <button onClick={() => handlePrint()} className="btn btn-primary w-full">
                      <Printer size={15} /> Cetak {selectedPasang.length} Label Unit
                    </button>
                  )}
                </>
              )}

              {selectedProduk && pasangList.length === 0 && (
                <div
                  style={{
                    textAlign: 'center',
                    padding: '20px',
                    color: 'var(--text-muted)',
                    fontSize: '13px',
                    background: 'var(--bg-input)',
                    borderRadius: 'var(--radius-sm)',
                  }}
                >
                  Tidak ada pasang tersedia untuk produk ini.<br />
                  Lakukan stock opname terlebih dahulu.
                </div>
              )}
            </div>
          </div>

          {/* Preview */}
          <div>
            {printItems.length === 0 ? (
              <div className="card">
                <div className="empty-state" style={{ padding: '80px 24px' }}>
                  <div className="empty-icon"><Barcode size={32} /></div>
                  <div className="empty-title">Preview Barcode Unit</div>
                  <div className="empty-desc">
                    Pilih produk dan centang pasang yang ingin dicetak barcode unitnya
                  </div>
                </div>
              </div>
            ) : (
              <div className="card">
                <div className="card-header">
                  <div className="card-title">
                    <Barcode size={16} /> Preview — {printItems.length} Label Unit
                  </div>
                  <button onClick={() => handlePrint()} className="btn btn-primary btn-sm">
                    <Printer size={14} /> Cetak
                  </button>
                </div>
                <div
                  className="card-body"
                  style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))',
                    gap: '14px',
                  }}
                >
                  {printItems.map((item) => (
                    <BarcodeLabel
                      key={item.id}
                      barcode={item.barcode}
                      title={(item.produk as any)?.nama_produk ?? 'Produk'}
                      subtitle={`Pasang — ${new Date(item.created_at).toLocaleDateString('id-ID')}`}
                      extra={`Status: ${item.status}`}
                      type="unit"
                    />
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Print hidden */}
      <div style={{ display: 'none' }}>
        <div
          ref={printRef}
          style={{ padding: '10mm', display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '5mm' }}
        >
          {printItems.map((item) => (
            <div key={item.id} style={{ pageBreakInside: 'avoid' }}>
              <BarcodeLabel
                barcode={item.barcode}
                title={(item.produk as any)?.nama_produk ?? 'Produk'}
                subtitle={`Pasang — ${new Date(item.created_at).toLocaleDateString('id-ID')}`}
                type="unit"
              />
            </div>
          ))}
        </div>
      </div>
    </>
  )
}
