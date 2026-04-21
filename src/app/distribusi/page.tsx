'use client'

import { useEffect, useRef, useState } from 'react'
import { supabase } from '@/lib/supabase'
import Toast, { useToast } from '@/components/Toast'
import { Truck, Scan, AlertCircle, CheckCircle2, Zap, RefreshCcw, Package, Camera } from 'lucide-react'
import CameraScanner from '@/components/CameraScanner'

// Local state for scan history
interface ScanRecord {
  id: string
  waktu: Date
  barcode: string
  tipe: 'unit' | 'coli'
  namaProduk: string
  detail: string
  status: 'sukses' | 'error'
  errorMsg?: string
}

export default function DistribusiPage() {
  const [barcodeInput, setBarcodeInput] = useState('')
  const [scanning, setScanning]         = useState(false)
  const [scanLog, setScanLog]           = useState<ScanRecord[]>([])
  const [lastScan, setLastScan]         = useState<{ status: 'ok' | 'error'; msg: string } | null>(null)
  const [showCamera, setShowCamera]     = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)
  const { toasts, addToast, removeToast } = useToast()

  useEffect(() => {
    inputRef.current?.focus()
  }, [])

  async function handleScan(e: React.FormEvent) {
    e.preventDefault()
    const code = barcodeInput.trim()
    if (!code || scanning) return

    setScanning(true)
    setBarcodeInput('')

    const record: ScanRecord = {
      id: crypto.randomUUID(),
      waktu: new Date(),
      barcode: code,
      tipe: code.startsWith('UNT-') ? 'unit' : 'coli',
      namaProduk: 'Unknown',
      detail: '',
      status: 'error',
    }

    try {
      if (code.startsWith('UNT-')) {
        // PROSES UNIT
        const { data: unitData } = await supabase
          .from('stok_unit')
          .select('*, produk(nama_produk), produk_varian(nama_varian)')
          .eq('barcode', code)
          .maybeSingle()

        if (!unitData) {
          throw new Error(`Barcode Unit "${code}" tidak ditemukan di sistem.`)
        }

        record.namaProduk = unitData.produk?.nama_produk || 'Produk Master Terhapus'
        record.detail = unitData.produk_varian?.nama_varian ? `Varian: ${unitData.produk_varian.nama_varian}` : 'Tanpa Varian'

        if (unitData.status === 'keluar') {
          throw new Error('Unit ini sudah pernah dikeluarkan sebelumnya.')
        } else if (unitData.status === 'rusak') {
          throw new Error('Unit ini dalam status RUSAK dan tidak bisa dikeluarkan.')
        }

        // Update status ke 'keluar'
        const { error: updErr } = await supabase
          .from('stok_unit')
          .update({ status: 'keluar' })
          .eq('id', unitData.id)
        if (updErr) throw updErr

        record.status = 'sukses'
        const msg = `✓ BISA KELUAR: ${record.namaProduk} (Unit)`
        setLastScan({ status: 'ok', msg })
        addToast('success', msg)

      } else if (code.startsWith('CLB-') || code.startsWith('COLI-')) { // Menerima format lama dan baru
        // PROSES COLI
        const { data: coliData } = await supabase
          .from('stok_coli')
          .select('*, produk(nama_produk), produk_coli(nomor_coli, nama_coli), produk_varian(nama_varian)')
          .eq('barcode', code)
          .maybeSingle()

        if (!coliData) {
          throw new Error(`Barcode Coli "${code}" tidak ditemukan.`)
        }

        record.namaProduk = coliData.produk?.nama_produk || 'Produk Master Terhapus'
        const varianName = coliData.produk_varian?.nama_varian ? `[${coliData.produk_varian.nama_varian}]` : ''
        record.detail = `Coli ${coliData.produk_coli?.nomor_coli}: ${coliData.produk_coli?.nama_coli} ${varianName}`

        if (coliData.status === 'keluar') {
          throw new Error('Coli ini sudah pernah dikeluarkan/terjual.')
        } else if (coliData.status === 'dipasangkan') {
          throw new Error('Ditolak! Coli ini sudah terbentuk menjadi satu Pasang/Unit. Scan barcode Pasang/Unit aslinya!')
        } else if (coliData.status === 'rusak') {
          throw new Error('Ditolak! Coli ini berstatus Rusak.')
        }

        // Update status ke 'keluar'
        const { error: updErr } = await supabase
          .from('stok_coli')
          .update({ status: 'keluar' })
          .eq('id', coliData.id)
        if (updErr) throw updErr

        record.status = 'sukses'
        const msg = `✓ ECERAN KELUAR: ${record.namaProduk} - ${record.detail}`
        setLastScan({ status: 'ok', msg })
        addToast('success', msg)

      } else {
        throw new Error('Format barcode tidak dikenali. Harus berawalan UNT- atau CLB-')
      }

    } catch (err: any) {
      record.status = 'error'
      record.errorMsg = err.message
      setLastScan({ status: 'error', msg: err.message })
      addToast('error', err.message)
    }

    setScanLog(prev => [record, ...prev])
    setScanning(false)
    inputRef.current?.focus()
  }

  // Handle direct scan from camera
  function handleCameraScan(code: string) {
    setShowCamera(false)
    setBarcodeInput(code)
    // small delay to let state update before triggering
    setTimeout(() => {
      const formEvent = { preventDefault: () => {} } as React.FormEvent
      handleScan(formEvent)
    }, 100)
  }

  const successCount = scanLog.filter(s => s.status === 'sukses').length

  return (
    <>
      <div className="topbar">
        <div>
          <div className="topbar-title">Scan Keluar / Penjualan</div>
          <div className="topbar-breadcrumb">Scan barcode untuk mengeluarkan stok Unit rakitan maupun Coli eceran</div>
        </div>
      </div>

      <div className="page-content">
        <Toast toasts={toasts} onRemove={removeToast} />

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px', alignItems: 'start' }}>
          
          {/* Panel Form Scan */}
          <div className="card">
            <div className="card-header">
              <div className="card-title" style={{ color: 'var(--primary)' }}>
                <Scan size={16} /> Scanner Mode Keluar
              </div>
            </div>
              <div className="card-body">
                <form onSubmit={handleScan}>
                  <div style={{ display: 'flex', gap: 10 }}>
                    <div className="barcode-input-box" style={{ flex: 1 }}>
                      <div className="scan-pulse" />
                      <input 
                        ref={inputRef} type="text" id="barcode-scan-input"
                        placeholder="Scan barcode (UNT- / CLB-)"
                        value={barcodeInput} 
                        onChange={(e) => setBarcodeInput(e.target.value)}
                        disabled={scanning} 
                        autoFocus 
                      />
                      <button type="submit" className="btn btn-primary btn-sm" disabled={scanning || !barcodeInput.trim()}>
                        {scanning ? <RefreshCcw size={14} className="spin" /> : <Zap size={14} />}
                      </button>
                    </div>
                    <button type="button" onClick={() => setShowCamera(true)} className="btn btn-secondary" disabled={scanning} style={{ padding: '0 16px' }} title="Scan pakai Kamera HP">
                      <Camera size={18} />
                    </button>
                  </div>
                </form>

                {showCamera && <CameraScanner onScan={handleCameraScan} onClose={() => setShowCamera(false)} />}

                {lastScan && (
                <div style={{
                  marginTop: 16, padding: '16px', borderRadius: 'var(--radius)',
                  background: lastScan.status === 'error' ? 'var(--red-bg)' : 'rgba(34,197,94,0.12)',
                  border: `1px solid ${lastScan.status === 'error' ? 'rgba(239,68,68,0.3)' : 'rgba(34,197,94,0.4)'}`,
                  color: lastScan.status === 'error' ? 'var(--red)' : 'var(--green)',
                  fontSize: '14px', fontWeight: 500,
                  display: 'flex', alignItems: 'flex-start', gap: 10,
                }}>
                  {lastScan.status === 'error' ? <AlertCircle size={20} style={{ flexShrink: 0 }} /> : <CheckCircle2 size={20} style={{ flexShrink: 0 }} />}
                  <span style={{ lineHeight: 1.4 }}>{lastScan.msg}</span>
                </div>
              )}

              <div style={{ marginTop: 24, padding: '16px', background: 'var(--bg-card)', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border)' }}>
                <h4 style={{ margin: '0 0 8px 0', fontSize: '13px', color: 'var(--text-secondary)' }}>Aturan Main:</h4>
                <ul style={{ margin: 0, paddingLeft: 16, color: 'var(--text-muted)', fontSize: '13px', lineHeight: 1.5 }}>
                  <li>Scan Barcode awalan <strong>UNT-</strong> untuk mengeluarkan Unit Rakitan.</li>
                  <li>Scan Barcode awalan <strong>CLB-</strong> untuk mengeluarkan part eceran.</li>
                  <li style={{ color: 'var(--red)' }}>Coli yang sudah tercatat di dalam "Pasang/Unit" akan <strong>ditolak otomatis</strong> agar stok tidak corrupt.</li>
                </ul>
              </div>
            </div>
          </div>

          {/* Panel Riwayat Sesi */}
          <div className="card">
            <div className="card-header">
              <div className="card-title">
                <Truck size={16} /> Riwayat Keluar Hari Ini
              </div>
              <span className="badge badge-green">{successCount} sukses</span>
            </div>
            
            {scanLog.length === 0 ? (
              <div className="empty-state" style={{ padding: '60px 24px' }}>
                <div className="empty-icon"><Package size={24} /></div>
                <div className="empty-title">Belum ada aktivitas</div>
                <div className="empty-desc">Scan barang yang akan keluar untuk memulai rekam data</div>
              </div>
            ) : (
              <div className="card-body" style={{ maxHeight: '600px', overflowY: 'auto', padding: 0 }}>
                {scanLog.map((log) => (
                  <div key={log.id} style={{
                    padding: '16px', borderBottom: '1px solid var(--border)',
                    display: 'flex', gap: 12, alignItems: 'flex-start',
                    background: log.status === 'sukses' ? 'transparent' : 'rgba(239, 68, 68, 0.05)'
                  }}>
                    {log.status === 'sukses' 
                      ? <CheckCircle2 size={16} color="var(--green)" style={{ marginTop: 2 }} />
                      : <AlertCircle size={16} color="var(--red)" style={{ marginTop: 2 }} />
                    }
                    <div style={{ flex: 1 }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                        <span className="mono" style={{ fontSize: '12px', fontWeight: 700, color: log.status === 'sukses' ? 'var(--primary)' : 'var(--red)' }}>
                          {log.barcode}
                        </span>
                        <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                          {log.waktu.toLocaleTimeString('id-ID')}
                        </span>
                      </div>
                      
                      {log.status === 'sukses' ? (
                        <>
                          <div style={{ fontSize: '14px', fontWeight: 500, color: 'var(--text-primary)' }}>{log.namaProduk}</div>
                          <div style={{ fontSize: '12px', color: 'var(--text-secondary)', marginTop: 4 }}>{log.detail}</div>
                        </>
                      ) : (
                        <div style={{ fontSize: '13px', color: 'var(--red)' }}>{log.errorMsg}</div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

        </div>
      </div>
    </>
  )
}
