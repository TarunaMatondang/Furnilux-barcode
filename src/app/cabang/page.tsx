'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { Cabang } from '@/lib/types'
import Toast, { useToast } from '@/components/Toast'
import {
  Building2, Plus, Edit2, Trash2, X, Save,
  MapPin, CheckCircle2, XCircle, ToggleLeft, ToggleRight,
} from 'lucide-react'

export default function CabangPage() {
  const [list, setList] = useState<Cabang[]>([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [editItem, setEditItem] = useState<Cabang | null>(null)
  const [form, setForm] = useState({ kode_cabang: '', nama_cabang: '', alamat: '', kota: '', aktif: true })
  const { toasts, addToast, removeToast } = useToast()

  useEffect(() => { fetchData() }, [])

  async function fetchData() {
    setLoading(true)
    const { data } = await supabase.from('cabang').select('*').order('kode_cabang')
    setList(data ?? [])
    setLoading(false)
  }

  function openAdd() {
    setEditItem(null)
    setForm({ kode_cabang: '', nama_cabang: '', alamat: '', kota: '', aktif: true })
    setShowModal(true)
  }

  function openEdit(item: Cabang) {
    setEditItem(item)
    setForm({ kode_cabang: item.kode_cabang, nama_cabang: item.nama_cabang, alamat: item.alamat ?? '', kota: item.kota ?? '', aktif: item.aktif })
    setShowModal(true)
  }

  async function save(e: React.FormEvent) {
    e.preventDefault()
    const payload = {
      kode_cabang: form.kode_cabang.trim().toUpperCase(),
      nama_cabang: form.nama_cabang.trim(),
      alamat: form.alamat || null,
      kota: form.kota || null,
      aktif: form.aktif,
    }
    const { error } = editItem
      ? await supabase.from('cabang').update(payload).eq('id', editItem.id)
      : await supabase.from('cabang').insert(payload)
    if (error) { addToast('error', error.message); return }
    addToast('success', editItem ? 'Cabang diupdate' : 'Cabang ditambahkan')
    setShowModal(false)
    fetchData()
  }

  async function toggleAktif(item: Cabang) {
    const { error } = await supabase.from('cabang').update({ aktif: !item.aktif }).eq('id', item.id)
    if (error) { addToast('error', error.message); return }
    addToast('info', `Cabang ${item.aktif ? 'dinonaktifkan' : 'diaktifkan'}`)
    fetchData()
  }

  async function hapus(id: string) {
    if (!confirm('Hapus ya cabang ini? Stok terkait akan kehilangan referensi cabang.')) return
    const { error } = await supabase.from('cabang').delete().eq('id', id)
    if (error) { addToast('error', error.message); return }
    addToast('success', 'Cabang dihapus')
    fetchData()
  }

  return (
    <>
      <div className="topbar">
        <div>
          <div className="topbar-title">Cabang</div>
          <div className="topbar-breadcrumb">Kelola cabang gudang — stok dikelola per cabang</div>
        </div>
        <button onClick={openAdd} className="btn btn-primary btn-sm">
          <Plus size={15} /> Tambah Cabang
        </button>
      </div>

      <div className="page-content">
        <Toast toasts={toasts} onRemove={removeToast} />

        {/* Info Banner */}
        <div style={{
          background: 'var(--blue-bg)',
          border: '1px solid rgba(59,130,246,0.2)',
          borderRadius: 'var(--radius)',
          padding: '14px 18px',
          fontSize: '13px',
          color: 'var(--blue)',
          marginBottom: 20,
          display: 'flex',
          alignItems: 'center',
          gap: 10,
        }}>
          <Building2 size={16} />
          <span>
            Produk adalah <strong>master global</strong> — tidak terikat cabang.
            Stok coli, pasang, dan unit masing-masing dikelola per cabang.
          </span>
        </div>

        <div className="card">
          {loading ? (
            <div className="empty-state"><div className="spin" style={{ color: 'var(--primary)' }}><Building2 size={28} /></div></div>
          ) : list.length === 0 ? (
            <div className="empty-state">
              <div className="empty-icon"><Building2 size={32} /></div>
              <div className="empty-title">Belum ada cabang</div>
              <div className="empty-desc">Tambahkan cabang gudang untuk mulai mengelola stok per lokasi</div>
              <button onClick={openAdd} className="btn btn-primary btn-sm mt-4"><Plus size={14} /> Tambah Cabang</button>
            </div>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: 16, padding: 20 }}>
              {list.map((c) => (
                <div
                  key={c.id}
                  className="card"
                  style={{
                    padding: '20px',
                    borderLeft: `3px solid ${c.aktif ? 'var(--primary)' : 'var(--gray)'}`,
                    opacity: c.aktif ? 1 : 0.65,
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 12 }}>
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                        <div style={{
                          width: 36, height: 36,
                          background: c.aktif ? 'var(--primary-glow)' : 'var(--gray-bg)',
                          color: c.aktif ? 'var(--primary)' : 'var(--gray)',
                          borderRadius: 8,
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                        }}>
                          <Building2 size={16} />
                        </div>
                        <div>
                          <div style={{ fontWeight: 700, fontSize: '15px' }}>{c.nama_cabang}</div>
                          <div className="mono" style={{ fontSize: '11px', color: 'var(--primary)' }}>{c.kode_cabang}</div>
                        </div>
                      </div>
                    </div>
                    <span className={`badge ${c.aktif ? 'badge-green' : 'badge-gray'}`}>
                      {c.aktif ? <><CheckCircle2 size={9} /> Aktif</> : <><XCircle size={9} /> Nonaktif</>}
                    </span>
                  </div>

                  {(c.kota || c.alamat) && (
                    <div style={{ fontSize: '13px', color: 'var(--text-muted)', display: 'flex', alignItems: 'flex-start', gap: 6, marginBottom: 14 }}>
                      <MapPin size={13} style={{ flexShrink: 0, marginTop: 2 }} />
                      <span>{[c.kota, c.alamat].filter(Boolean).join(' — ')}</span>
                    </div>
                  )}

                  <div style={{ display: 'flex', gap: 8, paddingTop: 12, borderTop: '1px solid var(--border)' }}>
                    <button onClick={() => openEdit(c)} className="btn btn-ghost btn-sm" style={{ flex: 1 }}>
                      <Edit2 size={13} /> Edit
                    </button>
                    <button onClick={() => toggleAktif(c)} className="btn btn-ghost btn-sm" style={{ flex: 1 }}>
                      {c.aktif ? <><ToggleRight size={13} /> Nonaktifkan</> : <><ToggleLeft size={13} /> Aktifkan</>}
                    </button>
                    <button onClick={() => hapus(c.id)} className="btn btn-ghost btn-sm">
                      <Trash2 size={13} style={{ color: 'var(--red)' }} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {showModal && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal" style={{ maxWidth: 460 }} onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <div className="modal-title">{editItem ? 'Edit Cabang' : 'Tambah Cabang'}</div>
              <button onClick={() => setShowModal(false)} className="btn btn-ghost btn-sm"><X size={16} /></button>
            </div>
            <form onSubmit={save}>
              <div className="modal-body">
                <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                  <div className="form-grid form-grid-2">
                    <div className="form-group">
                      <label className="form-label">Kode Cabang *</label>
                      <input className="form-input font-mono" required placeholder="CBG-01" value={form.kode_cabang}
                        onChange={(e) => setForm({ ...form, kode_cabang: e.target.value })} />
                    </div>
                    <div className="form-group">
                      <label className="form-label">Kota</label>
                      <input className="form-input" placeholder="Jakarta" value={form.kota}
                        onChange={(e) => setForm({ ...form, kota: e.target.value })} />
                    </div>
                  </div>
                  <div className="form-group">
                    <label className="form-label">Nama Cabang *</label>
                    <input className="form-input" required placeholder="Gudang Pusat" value={form.nama_cabang}
                      onChange={(e) => setForm({ ...form, nama_cabang: e.target.value })} />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Alamat</label>
                    <textarea className="form-input" rows={2} placeholder="Jl. Contoh No. 1..." value={form.alamat}
                      onChange={(e) => setForm({ ...form, alamat: e.target.value })} style={{ resize: 'vertical' }} />
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <input type="checkbox" id="aktif-toggle" checked={form.aktif}
                      onChange={(e) => setForm({ ...form, aktif: e.target.checked })}
                      style={{ width: 16, height: 16, cursor: 'pointer', accentColor: 'var(--primary)' }} />
                    <label htmlFor="aktif-toggle" style={{ fontSize: '14px', cursor: 'pointer' }}>Cabang aktif</label>
                  </div>
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" onClick={() => setShowModal(false)} className="btn btn-secondary">Batal</button>
                <button type="submit" className="btn btn-primary"><Save size={15} /> {editItem ? 'Update' : 'Simpan'}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  )
}
