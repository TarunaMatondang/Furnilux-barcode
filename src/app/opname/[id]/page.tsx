'use client'

import React, { useEffect, useRef, useState, use } from 'react'
import { supabase } from '@/lib/supabase'
import {
  OpnameSesi, OpnameScan, ProdukColi, Produk,
  generateBarcodePasang,
} from '@/lib/types'
import { BarcodeLabel } from '@/components/BarcodeLabel'
import Toast, { useToast } from '@/components/Toast'
import {
  Scan, CheckCircle2, AlertCircle, X, ArrowLeft,
  Layers, Clock, Zap, RefreshCcw, Printer, Building2, ChevronDown, ChevronRight, Camera
} from 'lucide-react'
import Link from 'next/link'
import { useReactToPrint } from 'react-to-print'
import CameraScanner from '@/components/CameraScanner'

interface ColiProgress {
  produk: Produk
  totalColi: number
  scannedColi: ProdukColi[]
  isComplete: boolean
}

interface NewPasang {
  barcode: string
  produk: Produk
  varianNama?: string
  pasangId: string
}

export default function OpnameSesiPage({ params }: { params: Promise<{ id: string }> }) {
  const unwrappedParams = use(params)
  const sesiId = unwrappedParams.id
  const [sesi, setSesi]             = useState<OpnameSesi | null>(null)
  const [barcodeInput, setBarcodeInput] = useState('')
  const [scanning, setScanning]     = useState(false)
  const [scanLog, setScanLog]       = useState<OpnameScan[]>([])
  const [progressMap, setProgressMap] = useState<Record<string, ColiProgress>>({})
  const [newPasangList, setNewPasangList] = useState<NewPasang[]>([])
  const [lastScan, setLastScan]     = useState<{ status: 'ok' | 'error' | 'complete'; msg: string } | null>(null)
  
  const [showCamera, setShowCamera] = useState(false)

  // State for expanded pasang rows in Log
  const [expandedLogIds, setExpandedLogIds] = useState<Set<string>>(new Set())

  const inputRef  = useRef<HTMLInputElement>(null)
  const printRef  = useRef<HTMLDivElement>(null)
  const { toasts, addToast, removeToast } = useToast()
  const handlePrint = useReactToPrint({ contentRef: printRef })

  useEffect(() => {
    fetchSesi()
    fetchScanLog()
    inputRef.current?.focus()
  }, [sesiId])

  async function fetchSesi() {
    const { data } = await supabase
      .from('opname_sesi')
      .select('*, cabang(id, kode_cabang, nama_cabang)')
      .eq('id', sesiId).single()
    setSesi(data)
  }

  async function fetchScanLog() {
    const { data } = await supabase
      .from('opname_scan')
      .select(`*, produk(id, nama_produk, kode_produk, total_coli), produk_coli(id, nomor_coli, nama_coli), produk_varian(id, nama_varian, tipe_varian)`)
      .eq('sesi_id', sesiId)
      .order('scanned_at', { ascending: false })
      .limit(200) // Increase limits for accurate grouping
    setScanLog(data ?? [])

    // Build progress from coli scans
    const coliScans = (data ?? []).filter((s) => s.tipe === 'coli')
    const map: Record<string, ColiProgress> = {}
    for (const scan of coliScans) {
      if (!scan.produk || !scan.produk_coli) continue
      const pid = scan.produk.id
      if (!map[pid]) {
        map[pid] = { produk: scan.produk, totalColi: scan.produk.total_coli, scannedColi: [], isComplete: false }
      }
      if (!map[pid].scannedColi.find((c) => c.id === scan.produk_coli.id)) {
        map[pid].scannedColi.push(scan.produk_coli)
      }
    }
    Object.values(map).forEach((p) => { p.isComplete = p.scannedColi.length >= p.totalColi })
    setProgressMap(map)
  }

  async function handleScan(e: React.FormEvent) {
    e.preventDefault()
    const code = barcodeInput.trim()
    if (!code || scanning) return
    if (!sesi || sesi.status !== 'aktif') {
      addToast('error', 'Sesi sudah tidak aktif'); return
    }

    setScanning(true)
    setBarcodeInput('')

    try {
      const { data: dup } = await supabase
        .from('opname_scan').select('id').eq('sesi_id', sesiId).eq('barcode', code).maybeSingle()
      if (dup) {
        setLastScan({ status: 'error', msg: `Barcode ${code} sudah di-scan di sesi ini` })
        addToast('error', 'Barcode sudah pernah di-scan!')
        setScanning(false); inputRef.current?.focus(); return
      }

      const { data: coliData } = await supabase
        .from('stok_coli')
        .select(`*, produk(*), produk_coli(*), produk_varian(id, nama_varian, tipe_varian), cabang(id, nama_cabang)`)
        .eq('barcode', code)
        .maybeSingle()

      if (!coliData) {
        setLastScan({ status: 'error', msg: `Barcode "${code}" tidak ditemukan` })
        addToast('error', 'Barcode tidak ditemukan!')
        await supabase.from('opname_scan').insert({
          sesi_id: sesiId, barcode: code, tipe: 'coli',
          referensi_id: null, produk_id: null, produk_coli_id: null, varian_id: null,
        })
        setScanning(false); fetchScanLog(); inputRef.current?.focus(); return
      }

      if (coliData.status === 'dipasangkan' || coliData.status === 'keluar' || coliData.status === 'rusak') {
        const msg = `Coli ini berstatus ${coliData.status.toUpperCase()}`
        setLastScan({ status: 'error', msg })
        addToast('error', msg)
        setScanning(false); inputRef.current?.focus(); return
      }

      await supabase.from('opname_scan').insert({
        sesi_id: sesiId, barcode: code, tipe: 'coli', referensi_id: coliData.id,
        produk_id: coliData.produk_id, produk_coli_id: coliData.produk_coli_id, varian_id: coliData.varian_id ?? null,
      })

      const varianLabel = coliData.produk_varian?.nama_varian ? ` [${coliData.produk_varian.nama_varian}]` : ''
      setLastScan({ status: 'ok', msg: `✓ ${coliData.produk?.nama_produk}${varianLabel} — Coli ${coliData.produk_coli?.nomor_coli}` })

      await fetchScanLog()
      await checkAndFormPasang(coliData.produk_id, coliData.produk, coliData.produk?.total_coli ?? 1, coliData.varian_id, coliData.produk_varian?.nama_varian)

    } catch (err: any) {
      addToast('error', err.message)
    }

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

  async function checkAndFormPasang(produkId: string, produk: any, totalColi: number, varianId: string | null, varianNama?: string) {
    const { data: scansForProduk } = await supabase.from('opname_scan')
      .select('*, produk_coli(id, nomor_coli)').eq('sesi_id', sesiId).eq('produk_id', produkId)
      .eq('tipe', 'coli').not('referensi_id', 'is', null)

    if (!scansForProduk) return

    const sameColi = varianId ? scansForProduk.filter((s) => s.varian_id === varianId) : scansForProduk.filter((s) => !s.varian_id)
    const uniqueTypes = new Set(sameColi.map((s) => s.produk_coli_id).filter(Boolean))
    if (uniqueTypes.size < totalColi) return

    const coliIds = sameColi.filter((s) => s.referensi_id).map((s) => s.referensi_id)
    const { data: coliRecords } = await supabase.from('stok_coli').select('id, status, produk_coli_id').in('id', coliIds).eq('status', 'tersedia')
    if (!coliRecords || coliRecords.length < totalColi) return

    const usedTypes = new Set<string>()
    const selected: string[] = []
    for (const scan of sameColi) {
      if (scan.produk_coli_id && !usedTypes.has(scan.produk_coli_id) && scan.referensi_id) {
        const rec = coliRecords.find((c) => c.id === scan.referensi_id)
        if (rec && rec.status === 'tersedia') {
          usedTypes.add(scan.produk_coli_id)
          selected.push(scan.referensi_id)
        }
      }
    }
    if (selected.length < totalColi) return

    const pasangBarcode = generateBarcodePasang()
    const { data: pasangData, error } = await supabase.from('stok_pasang')
      .insert({ barcode: pasangBarcode, produk_id: produkId, varian_id: varianId ?? null, cabang_id: sesi?.cabang_id ?? null, status: 'tersedia' })
      .select().single()
    
    if (error || !pasangData) return

    await supabase.from('stok_coli').update({ status: 'dipasangkan', pasang_id: pasangData.id }).in('id', selected)
    await supabase.from('opname_scan').insert({
      sesi_id: sesiId, barcode: pasangBarcode, tipe: 'pasang',
      referensi_id: pasangData.id, produk_id: produkId, varian_id: varianId ?? null,
    })

    setLastScan({ status: 'complete', msg: `🎉 LENGKAP! Pasang: ${pasangBarcode}` })
    addToast('success', `Set lengkap! Barcode: ${pasangBarcode}`)
    setNewPasangList((prev) => [{ barcode: pasangBarcode, produk, varianNama, pasangId: pasangData.id }, ...prev])
    await fetchScanLog()
  }

  function toggleExpandLog(id: string) {
    setExpandedLogIds(prev => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  // --- Grouping Logic for Scan Log ---
  const groupedLogs: Array<any> = []
  for (const scan of scanLog.slice(0, 50)) { // limit ui render
    if (scan.tipe === 'pasang') {
      groupedLogs.push({ ...scan, childColi: [] })
    } else if (scan.tipe === 'coli') {
      const totalRequired = (scan.produk as any)?.total_coli || 1
      const parent = groupedLogs.find(p => p.tipe === 'pasang' && p.produk_id === scan.produk_id && p.varian_id === scan.varian_id && p.childColi.length < totalRequired)
      if (parent) parent.childColi.push(scan)
      else groupedLogs.push(scan) // standalone coli
    } else {
      groupedLogs.push(scan)
    }
  }

  const produkEntries  = Object.entries(progressMap)
  const completedCount = produkEntries.filter(([, p]) => p.isComplete).length
  const cab = (sesi as any)?.cabang

  return (
    <>
      <div className="topbar">
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <Link href="/opname" className="btn btn-ghost btn-sm"><ArrowLeft size={15} /></Link>
          <div>
            <div className="topbar-title">{sesi?.nama_sesi ?? 'Sesi Opname'}</div>
            <div className="topbar-breadcrumb" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              {cab && <><Building2 size={12} /> {cab.nama_cabang} ·</>}
              {sesi?.tanggal ? new Date(sesi.tanggal).toLocaleDateString('id-ID', { weekday: 'long', day: '2-digit', month: 'long', year: 'numeric' }) : ''}
            </div>
          </div>
        </div>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          {newPasangList.length > 0 && (
            <button onClick={() => handlePrint()} className="btn btn-secondary btn-sm">
              <Printer size={14} /> Cetak {newPasangList.length} Pasang
            </button>
          )}
          <span className={`badge ${sesi?.status === 'aktif' ? 'badge-green' : 'badge-gray'}`}>
            {sesi?.status === 'aktif' ? 'Sesi Aktif' : 'Selesai'}
          </span>
        </div>
      </div>

      <div className="page-content">
        <Toast toasts={toasts} onRemove={removeToast} />
        <div style={{ display: 'grid', gridTemplateColumns: '400px 1fr', gap: '24px', alignItems: 'start' }}>
          {/* ─── Scan Panel ───────────────────────────────── */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div className="card">
              <div className="card-header">
                <div className="card-title" style={{ color: 'var(--primary)' }}><Scan size={16} /> Scan Barcode Coli</div>
                {cab && <span className="badge badge-blue"><Building2 size={9} /> {cab.nama_cabang}</span>}
              </div>
              <div className="card-body">
                <form onSubmit={handleScan}>
                  <div style={{ display: 'flex', gap: 10 }}>
                    <div className="barcode-input-box" style={{ flex: 1 }}>
                      <div className="scan-pulse" />
                      <input ref={inputRef} type="text" id="barcode-scan-input"
                        placeholder={sesi?.status === 'aktif' ? 'Scan atau ketik barcode...' : 'Sesi sudah selesai'}
                        value={barcodeInput} onChange={(e) => setBarcodeInput(e.target.value)} disabled={scanning || sesi?.status !== 'aktif'} autoFocus />
                      <button type="submit" className="btn btn-primary btn-sm" disabled={scanning || !barcodeInput.trim() || sesi?.status !== 'aktif'}>
                        {scanning ? <RefreshCcw size={14} className="spin" /> : <Zap size={14} />}
                      </button>
                    </div>
                    <button type="button" onClick={() => setShowCamera(true)} className="btn btn-secondary" disabled={scanning || sesi?.status !== 'aktif'} style={{ padding: '0 16px' }} title="Scan pakai Kamera HP">
                      <Camera size={18} />
                    </button>
                  </div>
                </form>

                {showCamera && <CameraScanner onScan={handleCameraScan} onClose={() => setShowCamera(false)} />}

                {lastScan && (
                  <div style={{
                    marginTop: 12, padding: '12px 14px', borderRadius: 'var(--radius-sm)',
                    background: lastScan.status === 'error' ? 'var(--red-bg)' : lastScan.status === 'complete' ? 'rgba(34,197,94,0.12)' : 'var(--blue-bg)',
                    border: `1px solid ${lastScan.status === 'error' ? 'rgba(239,68,68,0.3)' : lastScan.status === 'complete' ? 'rgba(34,197,94,0.4)' : 'rgba(59,130,246,0.3)'}`,
                    color: lastScan.status === 'error' ? 'var(--red)' : lastScan.status === 'complete' ? 'var(--green)' : 'var(--blue)',
                    fontSize: '13px', fontWeight: 500, display: 'flex', alignItems: 'flex-start', gap: 8,
                  }}>
                    {lastScan.status === 'error' ? <AlertCircle size={15} style={{ flexShrink: 0, marginTop: 1 }} /> : <CheckCircle2 size={15} style={{ flexShrink: 0, marginTop: 1 }} />}
                    {lastScan.msg}
                  </div>
                )}
              </div>
            </div>

            {/* Stats */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
              {[
                { label: 'Total Scan', value: scanLog.filter((s) => s.tipe === 'coli').length, color: 'var(--primary)' },
                { label: 'Pasang Terbentuk', value: scanLog.filter((s) => s.tipe === 'pasang').length, color: 'var(--green)' },
              ].map((s) => (
                <div key={s.label} className="stat-card" style={{ '--accent-color': s.color } as React.CSSProperties}>
                  <div className="stat-label">{s.label}</div>
                  <div className="stat-value" style={{ fontSize: '26px', color: s.color }}>{s.value}</div>
                </div>
              ))}
            </div>
            
            {/* New Pasang CheckList */}
             {newPasangList.length > 0 && (
              <div className="card">
                <div className="card-header">
                  <div className="card-title" style={{ color: 'var(--green)' }}>
                    <CheckCircle2 size={16} /> Pasang Baru ({newPasangList.length})
                  </div>
                  <button onClick={() => handlePrint()} className="btn btn-success btn-sm"><Printer size={13} /> Cetak</button>
                </div>
                <div className="card-body" style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {newPasangList.map((p, i) => (
                    <div key={i} style={{ padding: '10px 12px', background: 'var(--green-bg)', border: '1px solid rgba(34,197,94,0.3)', borderRadius: 'var(--radius-sm)' }}>
                      <div className="mono" style={{ fontSize: '12px', fontWeight: 700, color: 'var(--green)' }}>{p.barcode}</div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* ─── Right Panel ──────────────────────────────── */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            {/* Scan Log - Grouped Table */}
            <div className="card">
              <div className="card-header">
                <div className="card-title"><Clock size={16} /> Log Scan Terbaru</div>
                <button onClick={fetchScanLog} className="btn btn-ghost btn-sm"><RefreshCcw size={13} /></button>
              </div>
              {groupedLogs.length === 0 ? (
                <div className="empty-state" style={{ padding: '40px 24px' }}>
                  <div className="empty-icon"><Scan size={24} /></div>
                  <div className="empty-title">Belum ada scan</div>
                </div>
              ) : (
                <div className="table-wrapper">
                  <table className="table">
                    <thead><tr><th>Barcode & Item</th><th>Produk / Varian</th><th>Waktu</th></tr></thead>
                    <tbody>
                      {groupedLogs.map((s) => {
                        const varian = (s as any).produk_varian
                        const coli   = (s as any).produk_coli
                        const isPasang = s.tipe === 'pasang'
                        const isExpanded = expandedLogIds.has(s.id)

                        return (
                          <React.Fragment key={s.id}>
                            <tr style={{ background: isPasang ? 'var(--dark-bg)' : 'transparent' }}>
                              <td>
                                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                  {isPasang ? (
                                    <button onClick={() => toggleExpandLog(s.id)} className="btn-ghost" style={{ padding: 4, width: 24, height: 24, display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: 4 }}>
                                      {isExpanded ? <ChevronDown size={14} color="var(--green)"/> : <ChevronRight size={14} color="var(--green)"/>}
                                    </button>
                                  ) : <div style={{ width: 24 }} />}
                                  
                                  <div>
                                    <div className="mono" style={{ color: isPasang ? 'var(--green)' : 'var(--primary)', fontSize: '12px' }}>{s.barcode}</div>
                                    <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                                      {isPasang ? <span style={{ color: 'var(--green)' }}>✓ PASANG LENGKAP ({s.childColi?.length})</span> : coli ? `Coli ${coli.nomor_coli}: ${coli.nama_coli}` : s.tipe}
                                    </div>
                                  </div>
                                </div>
                              </td>
                              <td>
                                <div style={{ fontSize: '13px' }}>{(s.produk as any)?.nama_produk ?? <span style={{ color: 'var(--red)' }}>Mising</span>}</div>
                                {varian?.nama_varian && <span className="badge badge-cyan" style={{ marginTop: 4 }}>{varian.nama_varian}</span>}
                              </td>
                              <td style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                                {new Date(s.scanned_at).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                              </td>
                            </tr>
                            
                            {/* Children Coli of a Pasang */}
                            {isPasang && isExpanded && s.childColi?.map((child: any) => {
                               const cColi = child.produk_coli
                               return (
                                <tr key={child.id} style={{ background: 'rgba(0,0,0,0.1)' }}>
                                  <td style={{ paddingLeft: 42 }}>
                                    <div className="mono" style={{ color: 'var(--text-secondary)', fontSize: '11px' }}>↳ {child.barcode}</div>
                                    <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Coli {cColi?.nomor_coli}: {cColi?.nama_coli}</div>
                                  </td>
                                  <td style={{ fontSize: '12px', color: 'var(--text-muted)' }}>—</td>
                                  <td style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                                    {new Date(child.scanned_at).toLocaleTimeString('id-ID', { hour:'2-digit', minute:'2-digit', second:'2-digit'})}
                                  </td>
                                </tr>
                               )
                            })}
                          </React.Fragment>
                        )
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

          </div>
        </div>
      </div>

      <div style={{ display: 'none' }}>
        <div ref={printRef} style={{ padding: '10mm', display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '5mm' }}>
          {newPasangList.map((item, i) => (
             <div key={i} style={{ pageBreakInside: 'avoid' }}><BarcodeLabel barcode={item.barcode} title={item.produk?.nama_produk} subtitle={[item.varianNama, cab?.nama_cabang].filter(Boolean).join(' — ')} type="pasang" /></div>
          ))}
        </div>
      </div>
    </>
  )
}
