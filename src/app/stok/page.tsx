'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { Cabang } from '@/lib/types'
import { Boxes, Layers, Archive, CheckCircle2, Package, ChevronRight, Building2 } from 'lucide-react'
import Link from 'next/link'

export default function StokPage() {
  const [cabangList, setCabangList]   = useState<Cabang[]>([])
  const [selectedCabang, setSelectedCabang] = useState('')
  const [stats, setStats] = useState({
    coliTersedia: 0, coliDipasangkan: 0, coliRusak: 0, coliKeluar: 0,
    pasangTersedia: 0, pasangDirakit: 0,
    unitTersedia: 0, unitKeluar: 0,
  })
  const [produkList, setProdukList] = useState<any[]>([])
  const [loading, setLoading]       = useState(true)

  useEffect(() => {
    async function fetchCabang() {
      const { data } = await supabase.from('cabang').select('*').eq('aktif', true).order('nama_cabang')
      setCabangList(data ?? [])
    }
    fetchCabang()
  }, [])

  useEffect(() => {
    fetchStatsAndProduk()
  }, [selectedCabang])

  async function fetchStatsAndProduk() {
    setLoading(true)
    const cab = selectedCabang || null
    const addFilter = (q: any) => cab ? q.eq('cabang_id', cab) : q

    // Fetch Stats (Dashboard Overview)
    const [
      { count: c1 }, { count: c2 }, { count: c3 }, { count: c4 },
      { count: p1 }, { count: p2 },
      { count: u1 }, { count: u2 },
    ] = await Promise.all([
      addFilter(supabase.from('stok_coli').select('*', { count: 'exact', head: true }).eq('status', 'tersedia')),
      addFilter(supabase.from('stok_coli').select('*', { count: 'exact', head: true }).eq('status', 'dipasangkan')),
      addFilter(supabase.from('stok_coli').select('*', { count: 'exact', head: true }).eq('status', 'rusak')),
      addFilter(supabase.from('stok_coli').select('*', { count: 'exact', head: true }).eq('status', 'keluar')),
      addFilter(supabase.from('stok_pasang').select('*', { count: 'exact', head: true }).eq('status', 'tersedia')),
      addFilter(supabase.from('stok_pasang').select('*', { count: 'exact', head: true }).eq('status', 'dirakit')),
      addFilter(supabase.from('stok_unit').select('*', { count: 'exact', head: true }).eq('status', 'tersedia')),
      addFilter(supabase.from('stok_unit').select('*', { count: 'exact', head: true }).eq('status', 'keluar')),
    ])
    setStats({
      coliTersedia: c1 ?? 0, coliDipasangkan: c2 ?? 0, coliRusak: c3 ?? 0, coliKeluar: c4 ?? 0,
      pasangTersedia: p1 ?? 0, pasangDirakit: p2 ?? 0,
      unitTersedia: u1 ?? 0, unitKeluar: u2 ?? 0,
    })

    // Fetch Produk & Aggregate Stok Counts
    const { data: pData } = await supabase.from('produk').select('id, kode_produk, nama_produk, kategori_produk(nama)').order('nama_produk')
    
    // We fetch all records related to this product type to count statuses
    const { data: cols } = await addFilter(supabase.from('stok_coli').select('produk_id, status'))
    const { data: unts } = await addFilter(supabase.from('stok_unit').select('produk_id, status'))
    
    const countColi: Record<string, any> = {}
    cols?.forEach((c: any) => {
      if (!countColi[c.produk_id]) countColi[c.produk_id] = { tersedia: 0, keluar: 0, total: 0 }
      countColi[c.produk_id].total++
      if (c.status === 'tersedia') countColi[c.produk_id].tersedia++
      if (c.status === 'keluar') countColi[c.produk_id].keluar++
    })

    const countUnit: Record<string, any> = {}
    unts?.forEach((u: any) => {
      if (!countUnit[u.produk_id]) countUnit[u.produk_id] = { tersedia: 0, keluar: 0, total: 0 }
      countUnit[u.produk_id].total++
      if (u.status === 'tersedia') countUnit[u.produk_id].tersedia++
      if (u.status === 'keluar') countUnit[u.produk_id].keluar++
    })

    const list = (pData || []).map((p: any) => ({
      ...p,
      coli: countColi[p.id] || { tersedia: 0, keluar: 0, total: 0 },
      unit: countUnit[p.id] || { tersedia: 0, keluar: 0, total: 0 }
    }))
    
    // sorting array: products with most available stock first
    list.sort((a: any, b: any) => (b.coli.tersedia + b.unit.tersedia) - (a.coli.tersedia + a.unit.tersedia))
    setProdukList(list)
    setLoading(false)
  }

  const sections = [
    {
      title: 'Stok Coli (Ecer)', icon: Layers, color: 'var(--cyan)', href: '/stok/coli',
      items: [
        { label: 'Tersedia', value: stats.coliTersedia, color: 'var(--green)' },
        { label: 'Dipasangkan', value: stats.coliDipasangkan, color: 'var(--blue)' },
      ],
    },
    {
      title: 'Stok Pasang (Set)', icon: Archive, color: 'var(--purple)', href: '/stok/pasang',
      items: [
        { label: 'Tersedia', value: stats.pasangTersedia, color: 'var(--green)' },
        { label: 'Dirakit', value: stats.pasangDirakit, color: 'var(--blue)' },
      ],
    },
    {
      title: 'Stok Unit (Rakitan)', icon: CheckCircle2, color: 'var(--green)', href: '/stok/unit',
      items: [
        { label: 'Tersedia', value: stats.unitTersedia, color: 'var(--green)' },
        { label: 'Keluar/Terjual', value: stats.unitKeluar, color: 'var(--purple)' },
      ],
    },
  ]

  const cabangSelected = cabangList.find((c) => c.id === selectedCabang)

  return (
    <>
      <div className="topbar">
        <div>
          <div className="topbar-title">Ringkasan Stok</div>
          <div className="topbar-breadcrumb">Overview stok coli, pasang, dan unit per cabang</div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <Building2 size={15} color="var(--text-muted)" />
          <select className="form-select" style={{ width: 200, padding: '7px 12px', fontSize: '13px' }}
            value={selectedCabang} onChange={(e) => setSelectedCabang(e.target.value)}>
            <option value="">Semua Cabang</option>
            {cabangList.map((c) => <option key={c.id} value={c.id}>{c.nama_cabang}</option>)}
          </select>
        </div>
      </div>

      <div className="page-content">
        {cabangSelected && (
          <div style={{
            background: 'var(--primary-glow)', border: '1px solid rgba(79,127,255,0.2)',
            borderRadius: 'var(--radius)', padding: '12px 18px', marginBottom: 20,
            display: 'flex', alignItems: 'center', gap: 10, fontSize: '14px',
          }}>
            <Building2 size={16} color="var(--primary)" />
            <span>Menampilkan stok untuk <strong style={{ color: 'var(--primary)' }}>{cabangSelected.nama_cabang}</strong></span>
          </div>
        )}

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16, marginBottom: 24 }}>
          {sections.map((sec) => {
            const Icon = sec.icon
            const cabangParam = selectedCabang ? `?cabang=${selectedCabang}` : ''
            return (
              <Link key={sec.href} href={`${sec.href}${cabangParam}`}>
                <div className="card" style={{ padding: '22px', cursor: 'pointer', borderTop: `3px solid ${sec.color}`, transition: 'all 0.2s' }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      <div style={{ width: 36, height: 36, borderRadius: 8, background: `${sec.color}15`, color: sec.color, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <Icon size={18} />
                      </div>
                      <div style={{ fontWeight: 700, fontSize: '15px' }}>{sec.title}</div>
                    </div>
                    <ChevronRight size={16} color="var(--text-muted)" />
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                    {sec.items.map((item) => (
                      <div key={item.label} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>{item.label}</span>
                        <span style={{ fontWeight: 700, fontSize: '20px', color: item.color }}>
                          {loading ? '—' : item.value.toLocaleString('id-ID')}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              </Link>
            )
          })}
        </div>

        <div className="card">
          <div className="card-header">
            <div className="card-title">
              <Package size={16} /> Data Aktual Produk <span style={{ color: 'var(--text-muted)', fontSize: '12px', fontWeight: 'normal' }}>(Status Keseluruhan)</span>
            </div>
            <Link href="/produk" className="btn btn-ghost btn-sm">Kelola Produk <ChevronRight size={14} /></Link>
          </div>
          {produkList.length === 0 ? (
            <div className="empty-state">
              <div className="empty-icon"><Package size={28} /></div>
              <div className="empty-title">Belum ada produk</div>
            </div>
          ) : (
            <div className="table-wrapper">
              <table className="table">
                <thead>
                  <tr>
                    <th>Kode</th>
                    <th>Nama Produk</th>
                    <th>Kategori</th>
                    <th>Stok Coli (Tersedia / Keluar / Total)</th>
                    <th>Stok Unit (Tersedia / Keluar / Total)</th>
                  </tr>
                </thead>
                <tbody>
                  {produkList.map((p) => (
                    <tr key={p.id}>
                      <td className="mono" style={{ color: 'var(--primary)', width: 100 }}>{p.kode_produk}</td>
                      <td style={{ fontWeight: 500 }}>{p.nama_produk}</td>
                      <td>
                        {p.kategori_produk?.nama ? <span className="badge badge-blue">{p.kategori_produk.nama}</span> : '—'}
                      </td>
                      <td>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                           <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                             <div style={{ display: 'flex', gap: 6, alignItems: 'baseline' }}>
                               <span style={{ fontWeight: 700, fontSize: '16px', color: p.coli.tersedia > 0 ? 'var(--cyan)' : 'var(--text-muted)' }}>{p.coli.tersedia}</span>
                               <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>/ {p.coli.keluar} / {p.coli.total}</span>
                             </div>
                             <div style={{ fontSize: '10px', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.4px' }}>Tersedia / Keluar / Total</div>
                           </div>
                           <Link href={`/stok/coli?produk=${p.id}${selectedCabang ? `&cabang=${selectedCabang}` : ''}`} className="btn-ghost" style={{ fontSize:'11px', padding:'2px 6px', borderRadius:4 }}>Lihat →</Link>
                        </div>
                      </td>
                      <td>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                           <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                             <div style={{ display: 'flex', gap: 6, alignItems: 'baseline' }}>
                               <span style={{ fontWeight: 700, fontSize: '16px', color: p.unit.tersedia > 0 ? 'var(--green)' : 'var(--text-muted)' }}>{p.unit.tersedia}</span>
                               <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>/ {p.unit.keluar} / {p.unit.total}</span>
                             </div>
                             <div style={{ fontSize: '10px', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.4px' }}>Tersedia / Keluar / Total</div>
                           </div>
                           <Link href={`/stok/unit?produk=${p.id}${selectedCabang ? `&cabang=${selectedCabang}` : ''}`} className="btn-ghost" style={{ fontSize:'11px', padding:'2px 6px', borderRadius:4 }}>Lihat →</Link>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </>
  )
}
