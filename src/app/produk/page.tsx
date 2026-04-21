'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { Produk, ProdukColi, ProdukVarian, KategoriProduk } from '@/lib/types'
import Toast, { useToast } from '@/components/Toast'
import {
  Package, Plus, Search, ChevronDown, ChevronUp,
  Trash2, Edit2, X, Layers, Save, Tag, Palette,
} from 'lucide-react'

// ─── Tipe Varian yang umum ────────────────────────────────
const TIPE_VARIAN_OPTIONS = ['Warna', 'Ukuran', 'Material', 'Model', 'Lainnya']

export default function ProdukPage() {
  // ─── State Produk ────────────────────────────────────────
  const [produkList, setProdukList]         = useState<Produk[]>([])
  const [kategoriList, setKategoriList]     = useState<KategoriProduk[]>([])
  const [search, setSearch]                 = useState('')
  const [filterKategori, setFilterKategori] = useState('')
  const [loading, setLoading]               = useState(true)
  const [showModal, setShowModal]           = useState(false)
  const [editProduk, setEditProduk]         = useState<Produk | null>(null)
  const [expandedId, setExpandedId]         = useState<string | null>(null)
  const [activeTab, setActiveTab]           = useState<'coli' | 'varian'>('coli')

  // ─── State Coli ──────────────────────────────────────────
  const [coliMap, setColiMap] = useState<Record<string, ProdukColi[]>>({})
  const [showColiModal, setShowColiModal]   = useState(false)
  const [selectedProdukId, setSelectedProdukId] = useState<string | null>(null)
  const [coliForm, setColiForm] = useState({ nomor_coli: 1, nama_coli: '', berat_kg: '', keterangan: '' })

  // ─── State Varian ────────────────────────────────────────
  const [varianMap, setVarianMap]           = useState<Record<string, ProdukVarian[]>>({})
  const [showVarianModal, setShowVarianModal] = useState(false)
  const [varianForm, setVarianForm] = useState({ kode_varian: '', nama_varian: '', tipe_varian: 'Warna' })

  // ─── Form Produk ─────────────────────────────────────────
  const [form, setForm] = useState({
    kode_produk: '', nama_produk: '', kategori_id: '',
    satuan: 'unit', total_coli: 1, deskripsi: '',
  })

  const { toasts, addToast, removeToast } = useToast()

  useEffect(() => {
    fetchKategori()
    fetchProduk()
  }, [])

  // ── Fetch ────────────────────────────────────────────────

  async function fetchKategori() {
    const { data } = await supabase.from('kategori_produk').select('*').order('nama')
    setKategoriList(data ?? [])
  }

  async function fetchProduk() {
    setLoading(true)
    const { data } = await supabase
      .from('produk')
      .select('*, kategori_produk(id, nama)')
      .order('created_at', { ascending: false })
    setProdukList(data ?? [])
    setLoading(false)
  }

  async function fetchColi(produkId: string) {
    const { data } = await supabase
      .from('produk_coli').select('*').eq('produk_id', produkId).order('nomor_coli')
    setColiMap((prev) => ({ ...prev, [produkId]: data ?? [] }))
  }

  async function fetchVarian(produkId: string) {
    const { data } = await supabase
      .from('produk_varian').select('*').eq('produk_id', produkId).order('created_at')
    setVarianMap((prev) => ({ ...prev, [produkId]: data ?? [] }))
  }

  // ── Produk CRUD ──────────────────────────────────────────

  function openAdd() {
    setEditProduk(null)
    setForm({ kode_produk: '', nama_produk: '', kategori_id: '', satuan: 'unit', total_coli: 1, deskripsi: '' })
    setShowModal(true)
  }

  function openEdit(p: Produk) {
    setEditProduk(p)
    setForm({
      kode_produk: p.kode_produk,
      nama_produk: p.nama_produk,
      kategori_id: p.kategori_id ?? '',
      satuan: p.satuan,
      total_coli: p.total_coli,
      deskripsi: p.deskripsi ?? '',
    })
    setShowModal(true)
  }

  async function saveProduk(e: React.FormEvent) {
    e.preventDefault()
    const payload = {
      kode_produk: form.kode_produk.trim(),
      nama_produk: form.nama_produk.trim(),
      kategori_id: form.kategori_id || null,
      satuan: form.satuan,
      total_coli: Number(form.total_coli),
      deskripsi: form.deskripsi || null,
    }
    const { error } = editProduk
      ? await supabase.from('produk').update(payload).eq('id', editProduk.id)
      : await supabase.from('produk').insert(payload)
    if (error) { addToast('error', error.message); return }
    addToast('success', editProduk ? 'Produk diupdate' : 'Produk ditambahkan')
    setShowModal(false)
    fetchProduk()
  }

  async function deleteProduk(id: string) {
    if (!confirm('Hapus produk beserta semua coli dan varian terkait?')) return
    const { error } = await supabase.from('produk').delete().eq('id', id)
    if (error) { addToast('error', error.message); return }
    addToast('success', 'Produk dihapus')
    fetchProduk()
  }

  // ── Expand toggle ────────────────────────────────────────

  function toggleExpand(id: string, tab: 'coli' | 'varian' = 'coli') {
    if (expandedId === id && activeTab === tab) {
      setExpandedId(null)
    } else {
      setExpandedId(id)
      setActiveTab(tab)
      if (tab === 'coli' && !coliMap[id]) fetchColi(id)
      if (tab === 'varian' && !varianMap[id]) fetchVarian(id)
    }
    if (expandedId !== id) {
      // always prefetch both when first expanding
      if (!coliMap[id]) fetchColi(id)
      if (!varianMap[id]) fetchVarian(id)
    }
  }

  function onTabChange(tab: 'coli' | 'varian') {
    setActiveTab(tab)
    if (!expandedId) return
    if (tab === 'coli' && !coliMap[expandedId]) fetchColi(expandedId)
    if (tab === 'varian' && !varianMap[expandedId]) fetchVarian(expandedId)
  }

  // ── Coli CRUD ────────────────────────────────────────────

  async function saveColi(e: React.FormEvent) {
    e.preventDefault()
    if (!selectedProdukId) return
    const { error } = await supabase.from('produk_coli').insert({
      produk_id: selectedProdukId,
      nomor_coli: coliForm.nomor_coli,
      nama_coli: coliForm.nama_coli.trim(),
      berat_kg:  coliForm.berat_kg ? Number(coliForm.berat_kg) : null,
      keterangan: coliForm.keterangan || null,
    })
    if (error) { addToast('error', error.message); return }
    addToast('success', 'Coli ditambahkan')
    setShowColiModal(false)
    fetchColi(selectedProdukId)
  }

  async function deleteColi(coliId: string, produkId: string) {
    if (!confirm('Hapus coli ini?')) return
    await supabase.from('produk_coli').delete().eq('id', coliId)
    addToast('success', 'Coli dihapus')
    fetchColi(produkId)
  }

  // ── Varian CRUD ──────────────────────────────────────────

  async function saveVarian(e: React.FormEvent) {
    e.preventDefault()
    if (!selectedProdukId) return
    const { error } = await supabase.from('produk_varian').insert({
      produk_id: selectedProdukId,
      kode_varian: varianForm.kode_varian.trim().toUpperCase(),
      nama_varian: varianForm.nama_varian.trim(),
      tipe_varian: varianForm.tipe_varian || null,
      aktif: true,
    })
    if (error) { addToast('error', error.message); return }
    addToast('success', 'Varian ditambahkan')
    setShowVarianModal(false)
    fetchVarian(selectedProdukId)
  }

  async function toggleVarianAktif(v: ProdukVarian, produkId: string) {
    await supabase.from('produk_varian').update({ aktif: !v.aktif }).eq('id', v.id)
    fetchVarian(produkId)
  }

  async function deleteVarian(varianId: string, produkId: string) {
    if (!confirm('Hapus varian ini?')) return
    await supabase.from('produk_varian').delete().eq('id', varianId)
    addToast('success', 'Varian dihapus')
    fetchVarian(produkId)
  }

  // ── Filter ───────────────────────────────────────────────

  const filtered = produkList.filter((p) => {
    const q = search.toLowerCase()
    const matchSearch = !q ||
      p.nama_produk.toLowerCase().includes(q) ||
      p.kode_produk.toLowerCase().includes(q)
    const matchKat = !filterKategori || p.kategori_id === filterKategori
    return matchSearch && matchKat
  })

  // ────────────────────────────────────────────────────────
  return (
    <>
      <div className="topbar">
        <div>
          <div className="topbar-title">Produk & Coli</div>
          <div className="topbar-breadcrumb">Master produk global — berlaku untuk semua cabang</div>
        </div>
        <button onClick={openAdd} className="btn btn-primary btn-sm">
          <Plus size={15} /> Tambah Produk
        </button>
      </div>

      <div className="page-content">
        <Toast toasts={toasts} onRemove={removeToast} />

        {/* Filter bar */}
        <div style={{ display: 'flex', gap: 12, marginBottom: 20, flexWrap: 'wrap' }}>
          <div style={{ position: 'relative', flex: 1, minWidth: 220 }}>
            <Search size={15} style={{ position: 'absolute', left: 11, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
            <input className="form-input" placeholder="Cari produk..." style={{ paddingLeft: 34 }}
              value={search} onChange={(e) => setSearch(e.target.value)} />
          </div>
          <select className="form-select" style={{ width: 200 }}
            value={filterKategori} onChange={(e) => setFilterKategori(e.target.value)}>
            <option value="">Semua Kategori</option>
            {kategoriList.map((k) => <option key={k.id} value={k.id}>{k.nama}</option>)}
          </select>
          <div style={{ display: 'flex', alignItems: 'center', padding: '0 14px', background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)', fontSize: '13px', color: 'var(--text-muted)' }}>
            {filtered.length} produk
          </div>
        </div>

        <div className="card">
          {/* Table header */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 140px 70px 80px 80px 160px', alignItems: 'center', padding: '10px 20px', background: 'var(--bg-input)', borderBottom: '1px solid var(--border)' }}>
            {['Produk', 'Kategori', 'Coli', 'Varian', 'Satuan', ''].map((h) => (
              <div key={h} style={{ fontSize: '11px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.8px', color: 'var(--text-muted)' }}>{h}</div>
            ))}
          </div>

          {loading ? (
            <div className="empty-state"><div className="spin" style={{ color: 'var(--primary)' }}><Package size={28} /></div></div>
          ) : filtered.length === 0 ? (
            <div className="empty-state">
              <div className="empty-icon"><Package size={32} /></div>
              <div className="empty-title">Belum ada produk</div>
              <div className="empty-desc">Tambahkan produk untuk mulai mendefinisikan coli dan varian</div>
              <button onClick={openAdd} className="btn btn-primary btn-sm mt-4"><Plus size={14} /> Tambah Produk</button>
            </div>
          ) : filtered.map((p) => {
            const isExpanded   = expandedId === p.id
            const colis        = coliMap[p.id]   ?? []
            const varians      = varianMap[p.id] ?? []
            const katLabel     = (p as any).kategori_produk?.nama ?? null

            return (
              <div key={p.id} style={{ borderBottom: '1px solid var(--border)' }}>
                {/* Row */}
                <div style={{
                  display: 'grid',
                  gridTemplateColumns: '1fr 140px 70px 80px 80px 160px',
                  alignItems: 'center',
                  padding: '14px 20px',
                  gap: 8,
                  background: isExpanded ? 'var(--bg-card-hover)' : 'transparent',
                  transition: 'background 0.15s',
                }}>
                  {/* Name */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <div style={{ width: 34, height: 34, background: 'var(--primary-glow)', borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--primary)', flexShrink: 0 }}>
                      <Package size={15} />
                    </div>
                    <div>
                      <div style={{ fontWeight: 600, fontSize: '14px' }}>{p.nama_produk}</div>
                      <div className="mono" style={{ fontSize: '11px', color: 'var(--text-muted)' }}>{p.kode_produk}</div>
                    </div>
                  </div>
                  {/* Kategori */}
                  <div>
                    {katLabel
                      ? <span className="badge badge-blue"><Tag size={9} /> {katLabel}</span>
                      : <span style={{ color: 'var(--text-muted)', fontSize: '12px' }}>—</span>}
                  </div>
                  {/* Coli count */}
                  <div>
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, background: 'var(--purple-bg)', color: 'var(--purple)', borderRadius: '99px', padding: '2px 9px', fontSize: '12px', fontWeight: 600 }}>
                      <Layers size={10} /> {p.total_coli}
                    </span>
                  </div>
                  {/* Varian count */}
                  <div>
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, background: 'var(--orange-bg)', color: 'var(--orange)', borderRadius: '99px', padding: '2px 9px', fontSize: '12px', fontWeight: 600 }}>
                      <Palette size={10} /> {varians.length || '?'}
                    </span>
                  </div>
                  {/* Satuan */}
                  <div style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>{p.satuan}</div>
                  {/* Actions */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: 4, justifyContent: 'flex-end' }}>
                    <button onClick={() => toggleExpand(p.id, 'coli')} className="btn btn-ghost btn-sm" title="Coli">
                      <Layers size={13} /> {isExpanded ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
                    </button>
                    <button onClick={() => openEdit(p)} className="btn btn-ghost btn-sm"><Edit2 size={13} /></button>
                    <button onClick={() => deleteProduk(p.id)} className="btn btn-ghost btn-sm"><Trash2 size={13} style={{ color: 'var(--red)' }} /></button>
                  </div>
                </div>

                {/* Expanded Panel */}
                {isExpanded && (
                  <div style={{ background: 'var(--bg)', borderTop: '1px solid var(--border)', animation: 'fadeIn 0.2s ease' }}>
                    {/* Tabs */}
                    <div style={{ display: 'flex', borderBottom: '1px solid var(--border)', padding: '0 20px' }}>
                      {(['coli', 'varian'] as const).map((tab) => (
                        <button
                          key={tab}
                          onClick={() => onTabChange(tab)}
                          style={{
                            padding: '10px 16px',
                            fontSize: '13px',
                            fontWeight: 600,
                            color: activeTab === tab ? 'var(--primary)' : 'var(--text-muted)',
                            borderBottom: activeTab === tab ? '2px solid var(--primary)' : '2px solid transparent',
                            background: 'none',
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            gap: 6,
                          }}
                        >
                          {tab === 'coli' ? <><Layers size={13} /> Coli ({colis.length}/{p.total_coli})</> : <><Palette size={13} /> Varian ({varianMap[p.id]?.length ?? 0})</>}
                        </button>
                      ))}
                    </div>

                    <div style={{ padding: '16px 20px' }}>
                      {/* COLI TAB */}
                      {activeTab === 'coli' && (
                        <>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                            <div style={{ fontSize: '13px', color: 'var(--text-muted)' }}>
                              Definisi pecahan fisik produk (berlaku semua varian &amp; cabang)
                            </div>
                            <button onClick={() => {
                              setSelectedProdukId(p.id)
                              setColiForm({ nomor_coli: colis.length + 1, nama_coli: '', berat_kg: '', keterangan: '' })
                              setShowColiModal(true)
                            }} className="btn btn-secondary btn-sm">
                              <Plus size={13} /> Tambah Coli
                            </button>
                          </div>
                          <div style={{ marginBottom: 10 }}>
                            <div className="progress-bar">
                              <div className={`progress-fill ${colis.length >= p.total_coli ? 'complete' : ''}`}
                                style={{ width: `${Math.min((colis.length / p.total_coli) * 100, 100)}%` }} />
                            </div>
                          </div>
                          {colis.length === 0 ? (
                            <div style={{ padding: '14px', textAlign: 'center', color: 'var(--text-muted)', fontSize: '13px', background: 'var(--bg-card)', borderRadius: 'var(--radius-sm)', border: '1px dashed var(--border)' }}>
                              Belum ada coli. Klik "Tambah Coli" untuk mendefinisikan pecahan produk.
                            </div>
                          ) : (
                            <div className="coli-grid">
                              {colis.map((c) => (
                                <div key={c.id} className="coli-item">
                                  <div className="coli-number">{c.nomor_coli}</div>
                                  <div style={{ flex: 1 }}>
                                    <div style={{ fontWeight: 600, fontSize: '14px' }}>{c.nama_coli}</div>
                                    <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                                      {[c.berat_kg ? `${c.berat_kg} kg` : null, c.keterangan].filter(Boolean).join(' · ')}
                                    </div>
                                  </div>
                                  <button onClick={() => deleteColi(c.id, p.id)} className="btn btn-ghost btn-sm">
                                    <Trash2 size={13} style={{ color: 'var(--red)' }} />
                                  </button>
                                </div>
                              ))}
                            </div>
                          )}
                        </>
                      )}

                      {/* VARIAN TAB */}
                      {activeTab === 'varian' && (
                        <>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                            <div style={{ fontSize: '13px', color: 'var(--text-muted)' }}>
                              Variasi produk (warna, ukuran, dll) — stok dipisah per varian
                            </div>
                            <button onClick={() => {
                              setSelectedProdukId(p.id)
                              setVarianForm({ kode_varian: '', nama_varian: '', tipe_varian: 'Warna' })
                              setShowVarianModal(true)
                            }} className="btn btn-secondary btn-sm">
                              <Plus size={13} /> Tambah Varian
                            </button>
                          </div>
                          {(varianMap[p.id] ?? []).length === 0 ? (
                            <div style={{ padding: '14px', textAlign: 'center', color: 'var(--text-muted)', fontSize: '13px', background: 'var(--bg-card)', borderRadius: 'var(--radius-sm)', border: '1px dashed var(--border)' }}>
                              Belum ada varian. Klik "Tambah Varian".
                            </div>
                          ) : (
                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 8 }}>
                              {(varianMap[p.id] ?? []).map((v) => (
                                <div key={v.id} style={{
                                  padding: '10px 12px',
                                  background: v.aktif ? 'var(--bg-card)' : 'var(--bg-input)',
                                  border: `1px solid ${v.aktif ? 'var(--border-light)' : 'var(--border)'}`,
                                  borderRadius: 'var(--radius-sm)',
                                  display: 'flex', alignItems: 'center', gap: 10,
                                  opacity: v.aktif ? 1 : 0.5,
                                }}>
                                  <div style={{ width: 28, height: 28, borderRadius: 6, background: 'var(--orange-bg)', color: 'var(--orange)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                                    <Palette size={13} />
                                  </div>
                                  <div style={{ flex: 1, minWidth: 0 }}>
                                    <div style={{ fontWeight: 600, fontSize: '13px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{v.nama_varian}</div>
                                    <div style={{ fontSize: '10px', color: 'var(--text-muted)' }}>{v.tipe_varian ?? ''} · <span className="mono">{v.kode_varian}</span></div>
                                  </div>
                                  <div style={{ display: 'flex', gap: 2 }}>
                                    <button onClick={() => toggleVarianAktif(v, p.id)} className="btn btn-ghost btn-sm" title={v.aktif ? 'Nonaktifkan' : 'Aktifkan'} style={{ padding: '4px 6px' }}>
                                      <span style={{ fontSize: '10px', color: v.aktif ? 'var(--green)' : 'var(--gray)' }}>{v.aktif ? '●' : '○'}</span>
                                    </button>
                                    <button onClick={() => deleteVarian(v.id, p.id)} className="btn btn-ghost btn-sm" style={{ padding: '4px 6px' }}>
                                      <Trash2 size={12} style={{ color: 'var(--red)' }} />
                                    </button>
                                  </div>
                                </div>
                              ))}
                            </div>
                          )}
                        </>
                      )}
                    </div>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      </div>

      {/* ─── Modal Produk ─────────────────────────────────── */}
      {showModal && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <div className="modal-title">{editProduk ? 'Edit Produk' : 'Tambah Produk'}</div>
              <button onClick={() => setShowModal(false)} className="btn btn-ghost btn-sm"><X size={16} /></button>
            </div>
            <form onSubmit={saveProduk}>
              <div className="modal-body">
                <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                  <div className="form-grid form-grid-2">
                    <div className="form-group">
                      <label className="form-label">Kode Produk *</label>
                      <input className="form-input font-mono" required placeholder="MM-001"
                        value={form.kode_produk} onChange={(e) => setForm({ ...form, kode_produk: e.target.value })} />
                    </div>
                    <div className="form-group">
                      <label className="form-label">Satuan</label>
                      <input className="form-input" placeholder="unit / set" value={form.satuan}
                        onChange={(e) => setForm({ ...form, satuan: e.target.value })} />
                    </div>
                  </div>
                  <div className="form-group">
                    <label className="form-label">Nama Produk *</label>
                    <input className="form-input" required placeholder="e.g. Meja Makan 4 Kursi"
                      value={form.nama_produk} onChange={(e) => setForm({ ...form, nama_produk: e.target.value })} />
                  </div>
                  <div className="form-grid form-grid-2">
                    <div className="form-group">
                      <label className="form-label">Kategori</label>
                      <select className="form-select" value={form.kategori_id}
                        onChange={(e) => setForm({ ...form, kategori_id: e.target.value })}>
                        <option value="">— Pilih kategori —</option>
                        {kategoriList.map((k) => <option key={k.id} value={k.id}>{k.nama}</option>)}
                      </select>
                    </div>
                    <div className="form-group">
                      <label className="form-label">Jumlah Coli *</label>
                      <input type="number" className="form-input" required min={1} max={20}
                        value={form.total_coli} onChange={(e) => setForm({ ...form, total_coli: Number(e.target.value) })} />
                    </div>
                  </div>
                  <div className="form-group">
                    <label className="form-label">Deskripsi</label>
                    <textarea className="form-input" rows={2} placeholder="Keterangan tambahan..."
                      value={form.deskripsi} onChange={(e) => setForm({ ...form, deskripsi: e.target.value })}
                      style={{ resize: 'vertical' }} />
                  </div>
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" onClick={() => setShowModal(false)} className="btn btn-secondary">Batal</button>
                <button type="submit" className="btn btn-primary"><Save size={15} /> {editProduk ? 'Update' : 'Simpan'}</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ─── Modal Coli ───────────────────────────────────── */}
      {showColiModal && (
        <div className="modal-overlay" onClick={() => setShowColiModal(false)}>
          <div className="modal" style={{ maxWidth: 440 }} onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <div className="modal-title">Tambah Coli</div>
              <button onClick={() => setShowColiModal(false)} className="btn btn-ghost btn-sm"><X size={16} /></button>
            </div>
            <form onSubmit={saveColi}>
              <div className="modal-body">
                <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                  <div className="form-grid form-grid-2">
                    <div className="form-group">
                      <label className="form-label">No. Coli *</label>
                      <input type="number" className="form-input" required min={1}
                        value={coliForm.nomor_coli} onChange={(e) => setColiForm({ ...coliForm, nomor_coli: Number(e.target.value) })} />
                    </div>
                    <div className="form-group">
                      <label className="form-label">Berat (kg)</label>
                      <input type="number" className="form-input" step="0.01" placeholder="0.00"
                        value={coliForm.berat_kg} onChange={(e) => setColiForm({ ...coliForm, berat_kg: e.target.value })} />
                    </div>
                  </div>
                  <div className="form-group">
                    <label className="form-label">Nama Coli *</label>
                    <input className="form-input" required placeholder="e.g. Daun Meja, 4 Kursi"
                      value={coliForm.nama_coli} onChange={(e) => setColiForm({ ...coliForm, nama_coli: e.target.value })} />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Keterangan</label>
                    <input className="form-input" placeholder="Opsional..."
                      value={coliForm.keterangan} onChange={(e) => setColiForm({ ...coliForm, keterangan: e.target.value })} />
                  </div>
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" onClick={() => setShowColiModal(false)} className="btn btn-secondary">Batal</button>
                <button type="submit" className="btn btn-primary"><Save size={15} /> Simpan Coli</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ─── Modal Varian ─────────────────────────────────── */}
      {showVarianModal && (
        <div className="modal-overlay" onClick={() => setShowVarianModal(false)}>
          <div className="modal" style={{ maxWidth: 440 }} onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <div className="modal-title">Tambah Varian</div>
              <button onClick={() => setShowVarianModal(false)} className="btn btn-ghost btn-sm"><X size={16} /></button>
            </div>
            <form onSubmit={saveVarian}>
              <div className="modal-body">
                <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                  <div className="form-group">
                    <label className="form-label">Tipe Varian</label>
                    <select className="form-select" value={varianForm.tipe_varian}
                      onChange={(e) => setVarianForm({ ...varianForm, tipe_varian: e.target.value })}>
                      {TIPE_VARIAN_OPTIONS.map((t) => <option key={t} value={t}>{t}</option>)}
                    </select>
                  </div>
                  <div className="form-grid form-grid-2">
                    <div className="form-group">
                      <label className="form-label">Kode Varian *</label>
                      <input className="form-input font-mono" required placeholder="CLR-001"
                        value={varianForm.kode_varian} onChange={(e) => setVarianForm({ ...varianForm, kode_varian: e.target.value })} />
                    </div>
                    <div className="form-group">
                      <label className="form-label">Nama Varian *</label>
                      <input className="form-input" required placeholder="e.g. Merah, 120cm"
                        value={varianForm.nama_varian} onChange={(e) => setVarianForm({ ...varianForm, nama_varian: e.target.value })} />
                    </div>
                  </div>
                  <div style={{ padding: '10px 12px', background: 'var(--orange-bg)', borderRadius: 'var(--radius-sm)', fontSize: '12px', color: 'var(--orange)', border: '1px solid rgba(249,115,22,0.2)' }}>
                    <Palette size={12} style={{ display: 'inline', marginRight: 6 }} />
                    Varian akan menjadi pilihan saat cetak barcode coli di gudang tiap cabang.
                  </div>
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" onClick={() => setShowVarianModal(false)} className="btn btn-secondary">Batal</button>
                <button type="submit" className="btn btn-primary"><Save size={15} /> Simpan Varian</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  )
}
