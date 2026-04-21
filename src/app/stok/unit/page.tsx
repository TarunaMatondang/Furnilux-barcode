'use client'

import React, { useEffect, useRef, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { Cabang } from '@/lib/types'
import { BarcodeLabel } from '@/components/BarcodeLabel'
import Toast, { useToast } from '@/components/Toast'
import { Archive, Search, Printer, AlertTriangle, CheckCircle2, Building2, Palette, ChevronDown, ChevronRight } from 'lucide-react'
import { useReactToPrint } from 'react-to-print'

const STATUS_BADGE: Record<string, string> = {
  tersedia: 'badge badge-green',
  keluar: 'badge badge-purple',
  rusak: 'badge badge-red',
}

export default function StokUnitPage() {
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
      .from('stok_unit')
      .select('*, produk(id, kode_produk, nama_produk), produk_varian(id, nama_varian, tipe_varian), cabang(id, nama_cabang)')
      .order('assembled_at', { ascending: false })
      .limit(500)
    
    if (filterProduk) q = q.eq('produk_id', filterProduk)
    if (filterCabang) q = q.eq('cabang_id', filterCabang)
    if (filterStatus) q = q.eq('status', filterStatus)
    
    const { data } = await q
    setItems(data ?? [])
    setLoading(false)
  }

  async function updateStatus(id: string, status: 'keluar' | 'rusak') {
    if (!confirm(`Tandai unit sebagai ${status}?`)) return
    const { error } = await supabase.from('stok_unit').update({ status }).eq('id', id)
    if (error) { addToast('error', error.message); return }
    addToast('success', `Status: ${status}`)
    fetchItems()
  }

  function doPrint(item: any) {
    setPrintItem(item)
    setTimeout(() => handlePrint(), 100)
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
        stats: { tersedia: 0, keluar: 0, rusak: 0 }, items: []
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
          <div className="topbar-title">Stok Unit</div>
          <div className="topbar-breadcrumb">Produk rakitan dengan barcode unit siap distribusi</div>
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
            <option value="keluar">Keluar</option>
            <option value="rusak">Rusak</option>
          </select>
        </div>

        <div className="card">
          {loading ? (
            <div className="empty-state"><div className="spin" style={{ color: 'var(--green)' }}><Archive size={28} /></div></div>
          ) : groupsArray.length === 0 ? (
            <div className="empty-state">
              <div className="empty-icon"><Archive size={32} /></div>
              <div className="empty-title">Belum ada unit</div>
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
                    <th>Tersedia (Unit)</th>
                    <th>Keluar/Terjual</th>
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
                          <td><span style={{ fontWeight: 700, color: group.stats.keluar ? 'var(--purple)' : 'var(--text-muted)' }}>{group.stats.keluar}</span></td>
                          <td><span style={{ fontWeight: 700 }}>{group.items.length} Unit Total</span></td>
                        </tr>
                        
                        {isExpanded && (
                          <tr>
                            <td colSpan={7} style={{ padding: 0, background: 'rgba(0,0,0,0.1)' }}>
                              <div style={{ padding: '16px 24px', borderTop: '1px solid var(--border)', borderBottom: '1px solid var(--border)' }}>
                                <table className="table" style={{ background: 'var(--bg-card)', borderRadius: 8, overflow: 'hidden' }}>
                                  <thead>
                                    <tr>
                                      <th>Barcode Unit</th>
                                      <th>Status</th>
                                      <th>Lokasi Gudang</th>
                                      <th>Tgl Rakit</th>
                                      <th>Aksi</th>
                                    </tr>
                                  </thead>
                                  <tbody>
                                    {group.items.map((item: any) => (
                                      <tr key={item.id}>
                                        <td className="mono" style={{ color: 'var(--green)', fontSize: '12px' }}>{item.barcode}</td>
                                        <td><span className={STATUS_BADGE[item.status] ?? 'badge badge-gray'}>{item.status}</span></td>
                                        <td style={{ fontSize: '12px', color: 'var(--text-muted)' }}>{item.lokasi || '—'}</td>
                                        <td style={{ fontSize: '12px', color: 'var(--text-muted)' }}>{new Date(item.assembled_at).toLocaleDateString('id-ID')}</td>
                                        <td>
                                          <div style={{ display: 'flex', gap: 4 }}>
                                            <button onClick={(e) => { e.stopPropagation(); doPrint(item) }} className="btn btn-ghost btn-sm" title="Cetak">
                                              <Printer size={13} />
                                            </button>
                                            {item.status === 'tersedia' && (
                                              <>
                                                <button onClick={(e) => { e.stopPropagation(); updateStatus(item.id, 'keluar') }} className="btn btn-ghost btn-sm" title="Keluar">
                                                  <CheckCircle2 size={13} style={{ color: 'var(--purple)' }} />
                                                </button>
                                                <button onClick={(e) => { e.stopPropagation(); updateStatus(item.id, 'rusak') }} className="btn btn-ghost btn-sm" title="Rusak">
                                                  <AlertTriangle size={13} style={{ color: 'var(--red)' }} />
                                                </button>
                                              </>
                                            )}
                                          </div>
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
              barcode={printItem.barcode}
              title={printItem.produk?.nama_produk ?? 'Produk'}
              subtitle={[printItem.produk_varian?.nama_varian, printItem.cabang?.nama_cabang].filter(Boolean).join(' — ')}
              extra={`Unit Rakitan — ${new Date(printItem.assembled_at).toLocaleDateString('id-ID')}`}
              type="unit"
            />
          )}
        </div>
      </div>
    </>
  )
}
