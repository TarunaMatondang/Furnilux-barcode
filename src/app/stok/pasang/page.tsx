'use client'

import React, { useEffect, useRef, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { Cabang, generateBarcodeUnit } from '@/lib/types'
import { BarcodeLabel } from '@/components/BarcodeLabel'
import Toast, { useToast } from '@/components/Toast'
import { Archive, Search, Hammer, Building2, Palette, ChevronDown, ChevronRight } from 'lucide-react'
import { useReactToPrint } from 'react-to-print'

const STATUS_BADGE: Record<string, string> = {
  tersedia: 'badge badge-green',
  dirakit: 'badge badge-blue',
  keluar: 'badge badge-purple',
}

export default function StokPasangPage() {
  const [items, setItems]           = useState<any[]>([])
  const [produkList, setProdukList] = useState<any[]>([])
  const [cabangList, setCabangList] = useState<Cabang[]>([])
  const [filterProduk, setFilterProduk] = useState('')
  const [filterCabang, setFilterCabang] = useState('')
  const [filterStatus, setFilterStatus] = useState('')
  const [search, setSearch]         = useState('')
  const [loading, setLoading]       = useState(true)
  
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set())

  const [printItem, setPrintItem]   = useState<any | null>(null)
  const printRef = useRef<HTMLDivElement>(null)
  const { toasts, addToast, removeToast } = useToast()
  const handlePrint = useReactToPrint({ contentRef: printRef })

  useEffect(() => {
    supabase.from('produk').select('id, kode_produk, nama_produk').order('nama_produk').then(({ data }) => setProdukList(data ?? []))
    supabase.from('cabang').select('*').eq('aktif', true).order('nama_cabang').then(({ data }) => setCabangList(data ?? []))
    fetchItems()
  }, [])

  useEffect(() => { fetchItems() }, [filterProduk, filterCabang, filterStatus])

  async function fetchItems() {
    setLoading(true)
    let q = supabase
      .from('stok_pasang')
      .select('*, produk(id, kode_produk, nama_produk), produk_varian(id, nama_varian, tipe_varian), cabang(id, nama_cabang)')
      .order('created_at', { ascending: false })
      .limit(500)
      
    if (filterProduk) q = q.eq('produk_id', filterProduk)
    if (filterCabang) q = q.eq('cabang_id', filterCabang)
    if (filterStatus) q = q.eq('status', filterStatus)
    
    const { data } = await q
    setItems(data ?? [])
    setLoading(false)
  }

  async function rakit(pasang: any) {
    if (!confirm('Rakit pasang ini menjadi unit? Sistem akan membuat barcode unit baru.')) return
    const unitBarcode = generateBarcodeUnit()
    const { data: unitData, error } = await supabase
      .from('stok_unit')
      .insert({
        barcode: unitBarcode, produk_id: pasang.produk_id,
        varian_id: pasang.varian_id ?? null, cabang_id: pasang.cabang_id ?? null,
        pasang_id: pasang.id, status: 'tersedia',
      })
      .select('*, produk(nama_produk), produk_varian(nama_varian), cabang(nama_cabang)')
      .single()
      
    if (error) { addToast('error', error.message); return }
    
    await supabase.from('stok_pasang').update({ status: 'dirakit', unit_id: unitData.id }).eq('id', pasang.id)
    addToast('success', `Unit dibuat! Barcode: ${unitBarcode}`)
    setPrintItem({ ...pasang, unitBarcode, unitData })
    setTimeout(() => handlePrint(), 100)
    fetchItems()
  }

  const filtered = items.filter((item) => {
    if (!search) return true
    const q = search.toLowerCase()
    return item.barcode.toLowerCase().includes(q) ||
      item.produk?.nama_produk?.toLowerCase().includes(q) ||
      item.cabang?.nama_cabang?.toLowerCase().includes(q) ||
      item.produk_varian?.nama_varian?.toLowerCase().includes(q)
  })

  // Grouping
  const groupedData: Record<string, any> = {}
  filtered.forEach(item => {
    const key = `${item.produk_id}-${item.varian_id || 'novariant'}-${item.cabang_id || 'nocabang'}`
    if (!groupedData[key]) {
      groupedData[key] = {
        key, produk: item.produk, varian: item.produk_varian, cabang: item.cabang,
        stats: { tersedia: 0, dirakit: 0, keluar: 0 }, items: []
      }
    }
    groupedData[key].items.push(item)
    if (item.status in groupedData[key].stats) groupedData[key].stats[item.status]++
  })

  const groupsArray = Object.values(groupedData).sort((a,b) => a.produk?.nama_produk?.localeCompare(b.produk?.nama_produk))

  function toggleExpand(key: string) {
    setExpandedGroups(prev => {
      const next = new Set(prev)
      if (next.has(key)) next.delete(key)
      else next.add(key)
      return next
    })
  }

  return (
    <>
      <div className="topbar">
        <div>
          <div className="topbar-title">Stok Pasang</div>
          <div className="topbar-breadcrumb">Set lengkap dari coli — siap dirakit per cabang &amp; varian</div>
        </div>
      </div>

      <div className="page-content">
        <Toast toasts={toasts} onRemove={removeToast} />

        <div style={{ display: 'flex', gap: 12, marginBottom: 18, flexWrap: 'wrap' }}>
          <div style={{ position: 'relative', flex: 1, minWidth: 200 }}>
            <Search size={15} style={{ position: 'absolute', left: 11, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
            <input className="form-input" placeholder="Cari barcode / produk..." style={{ paddingLeft: 34 }}
              value={search} onChange={(e) => setSearch(e.target.value)} />
          </div>
          <select className="form-select" style={{ width: 200 }} value={filterProduk} onChange={(e) => setFilterProduk(e.target.value)}>
            <option value="">Semua Produk</option>
            {produkList.map((p) => <option key={p.id} value={p.id}>[{p.kode_produk}] {p.nama_produk}</option>)}
          </select>
          <select className="form-select" style={{ width: 180 }} value={filterCabang} onChange={(e) => setFilterCabang(e.target.value)}>
            <option value="">Semua Cabang</option>
            {cabangList.map((c) => <option key={c.id} value={c.id}>{c.nama_cabang}</option>)}
          </select>
          <select className="form-select" style={{ width: 140 }} value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)}>
            <option value="">Semua Status</option>
            <option value="tersedia">Tersedia</option>
            <option value="dirakit">Dirakit</option>
            <option value="keluar">Keluar</option>
          </select>
        </div>

        <div className="card">
          {loading ? (
            <div className="empty-state"><div className="spin" style={{ color: 'var(--purple)' }}><Archive size={28} /></div></div>
          ) : groupsArray.length === 0 ? (
             <div className="empty-state">
              <div className="empty-icon"><Archive size={32} /></div>
              <div className="empty-title">Belum ada pasang</div>
            </div>
          ) : (
            <div className="table-wrapper">
              <table className="table">
                <thead>
                  <tr>
                    <th style={{ width: 40 }}></th>
                    <th>Produk</th>
                    <th>Varian</th>
                    <th>Cabang</th>
                    <th>Tersedia (Set)</th>
                    <th>Dirakit (Set)</th>
                    <th>Subtotal</th>
                  </tr>
                </thead>
                <tbody>
                  {groupsArray.map((group) => {
                    const isExpanded = expandedGroups.has(group.key)
                    return (
                      <React.Fragment key={group.key}>
                        <tr style={{ background: isExpanded ? 'var(--dark-bg)' : 'transparent', cursor: 'pointer' }} onClick={() => toggleExpand(group.key)}>
                          <td>
                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: 24, height: 24, borderRadius: 4, background: 'rgba(255,255,255,0.05)' }}>
                               {isExpanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                            </div>
                          </td>
                          <td style={{ fontWeight: 600, fontSize: '14px' }}>{group.produk?.nama_produk} <span style={{ fontSize: '11px', color: 'var(--primary)', fontWeight: 'normal' }}>[{group.produk?.kode_produk}]</span></td>
                          <td>{group.varian ? <span className="badge badge-cyan">{group.varian.nama_varian}</span> : '—'}</td>
                          <td>{group.cabang ? <span className="badge badge-blue"><Building2 size={9} /> {group.cabang.nama_cabang}</span> : '—'}</td>
                          <td><span style={{ fontWeight: 700, color: group.stats.tersedia ? 'var(--green)' : 'var(--text-muted)' }}>{group.stats.tersedia}</span></td>
                          <td><span style={{ fontWeight: 700, color: group.stats.dirakit ? 'var(--blue)' : 'var(--text-muted)' }}>{group.stats.dirakit}</span></td>
                          <td><span style={{ fontWeight: 700 }}>{group.items.length} Set Total</span></td>
                        </tr>
                        
                        {isExpanded && (
                          <tr>
                            <td colSpan={7} style={{ padding: 0, background: 'rgba(0,0,0,0.1)' }}>
                              <div style={{ padding: '16px 24px', borderTop: '1px solid var(--border)', borderBottom: '1px solid var(--border)' }}>
                                <table className="table" style={{ background: 'var(--bg-card)', borderRadius: 8, overflow: 'hidden' }}>
                                  <thead>
                                    <tr>
                                      <th>Barcode Pasang</th>
                                      <th>Status</th>
                                      <th>Tanggal Terbentuk</th>
                                      <th>Aksi</th>
                                    </tr>
                                  </thead>
                                  <tbody>
                                    {group.items.map((item: any) => (
                                      <tr key={item.id}>
                                        <td className="mono" style={{ color: 'var(--purple)', fontSize: '12px' }}>{item.barcode}</td>
                                        <td><span className={STATUS_BADGE[item.status] ?? 'badge badge-gray'}>{item.status}</span></td>
                                        <td style={{ fontSize: '12px', color: 'var(--text-muted)' }}>{new Date(item.created_at).toLocaleDateString('id-ID')}</td>
                                        <td>
                                          {item.status === 'tersedia' && (
                                            <button onClick={(e) => { e.stopPropagation(); rakit(item) }} className="btn btn-secondary btn-sm">
                                              <Hammer size={13} /> Rakit → Unit
                                            </button>
                                          )}
                                        </td>
                                      </tr>
                                    ))}
                                  </tbody>
                                </table>
                              </div>
                            </td>
                          </tr>
                        )}
                      </React.Fragment>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      <div style={{ display: 'none' }}>
        <div ref={printRef} style={{ padding: '10mm' }}>
          {printItem && (
            <BarcodeLabel
              barcode={printItem.unitBarcode}
              title={printItem.produk?.nama_produk ?? 'Produk'}
              subtitle={[printItem.produk_varian?.nama_varian, printItem.cabang?.nama_cabang].filter(Boolean).join(' — ')}
              extra={`Unit Rakitan — ${new Date().toLocaleDateString('id-ID')}`}
              type="unit"
            />
          )}
        </div>
      </div>
    </>
  )
}
