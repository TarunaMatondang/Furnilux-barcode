'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { OpnameSesi, Cabang } from '@/lib/types'
import Toast, { useToast } from '@/components/Toast'
import {
  ClipboardList, Plus, Play, CheckCircle2,
  X, Save, ChevronRight, Calendar, Scan, Building2,
} from 'lucide-react'
import Link from 'next/link'

export default function OpnamePage() {
  const [sesiList, setSesiList]   = useState<OpnameSesi[]>([])
  const [cabangList, setCabangList] = useState<Cabang[]>([])
  const [loading, setLoading]     = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [scanCounts, setScanCounts] = useState<Record<string, number>>({})
  const [form, setForm] = useState({ nama_sesi: '', tanggal: '', cabang_id: '', catatan: '' })
  const { toasts, addToast, removeToast } = useToast()

  useEffect(() => {
    fetchCabang()
    fetchSesi()
  }, [])

  async function fetchCabang() {
    const { data } = await supabase.from('cabang').select('*').eq('aktif', true).order('nama_cabang')
    setCabangList(data ?? [])
  }

  async function fetchSesi() {
    setLoading(true)
    const { data } = await supabase
      .from('opname_sesi')
      .select('*, cabang(id, kode_cabang, nama_cabang)')
      .order('created_at', { ascending: false })
    setSesiList(data ?? [])

    if (data && data.length > 0) {
      const counts: Record<string, number> = {}
      await Promise.all(data.map(async (s) => {
        const { count } = await supabase
          .from('opname_scan').select('*', { count: 'exact', head: true }).eq('sesi_id', s.id)
        counts[s.id] = count ?? 0
      }))
      setScanCounts(counts)
    }
    setLoading(false)
  }

  async function createSesi(e: React.FormEvent) {
    e.preventDefault()
    const today = new Date().toISOString().split('T')[0]
    const { error } = await supabase.from('opname_sesi').insert({
      nama_sesi: form.nama_sesi.trim(),
      tanggal: form.tanggal || today,
      cabang_id: form.cabang_id || null,
      catatan: form.catatan || null,
      status: 'aktif',
    })
    if (error) { addToast('error', error.message); return }
    addToast('success', 'Sesi opname berhasil dibuat')
    setShowModal(false)
    fetchSesi()
  }

  async function selesaikan(id: string) {
    if (!confirm('Selesaikan sesi opname ini?')) return
    await supabase.from('opname_sesi').update({ status: 'selesai' }).eq('id', id)
    addToast('success', 'Sesi selesai')
    fetchSesi()
  }

  async function hapusSesi(id: string) {
    if (!confirm('Hapus sesi beserta semua log scan-nya?')) return
    await supabase.from('opname_sesi').delete().eq('id', id)
    addToast('success', 'Sesi dihapus')
    fetchSesi()
  }

  function openCreate() {
    const today = new Date().toISOString().split('T')[0]
    setForm({
      nama_sesi: `Opname ${new Date().toLocaleDateString('id-ID', { day: '2-digit', month: 'long', year: 'numeric' })}`,
      tanggal: today,
      cabang_id: '',
      catatan: '',
    })
    setShowModal(true)
  }

  return (
    <>
      <div className="topbar">
        <div>
          <div className="topbar-title">Sesi Opname</div>
          <div className="topbar-breadcrumb">Stock opname per cabang — scan barcode coli</div>
        </div>
        <button onClick={openCreate} className="btn btn-primary btn-sm">
          <Plus size={15} /> Buat Sesi Baru
        </button>
      </div>

      <div className="page-content">
        <Toast toasts={toasts} onRemove={removeToast} />

        {loading ? (
          <div className="card"><div className="empty-state"><div className="spin" style={{ color: 'var(--primary)' }}><ClipboardList size={28} /></div></div></div>
        ) : sesiList.length === 0 ? (
          <div className="card">
            <div className="empty-state">
              <div className="empty-icon"><ClipboardList size={32} /></div>
              <div className="empty-title">Belum ada sesi opname</div>
              <div className="empty-desc">Buat sesi baru untuk mulai scan barcode coli di cabang</div>
              <button onClick={openCreate} className="btn btn-primary btn-sm mt-4"><Plus size={14} /> Buat Sesi Pertama</button>
            </div>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {sesiList.map((sesi) => {
              const cab = (sesi as any).cabang
              return (
                <div key={sesi.id} className="card" style={{ borderLeft: `3px solid ${sesi.status === 'aktif' ? 'var(--green)' : 'var(--gray)'}` }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '18px 22px', gap: 16 }}>
                    <div style={{ flex: 1 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6, flexWrap: 'wrap' }}>
                        <div style={{ fontWeight: 700, fontSize: '15px' }}>{sesi.nama_sesi}</div>
                        <span className={`badge ${sesi.status === 'aktif' ? 'badge-green' : 'badge-gray'}`}>
                          {sesi.status === 'aktif' ? <><Play size={9} /> Aktif</> : <><CheckCircle2 size={9} /> Selesai</>}
                        </span>
                        {cab && (
                          <span className="badge badge-blue">
                            <Building2 size={9} /> {cab.nama_cabang}
                          </span>
                        )}
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 16, fontSize: '13px', color: 'var(--text-muted)', flexWrap: 'wrap' }}>
                        <span style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                          <Calendar size={13} />
                          {new Date(sesi.tanggal).toLocaleDateString('id-ID', { weekday: 'long', day: '2-digit', month: 'long', year: 'numeric' })}
                        </span>
                        <span style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                          <Scan size={13} /> {scanCounts[sesi.id] ?? 0} scan
                        </span>
                      </div>
                      {sesi.catatan && <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: 4 }}>{sesi.catatan}</div>}
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      {sesi.status === 'aktif' && (
                        <>
                          <button onClick={() => selesaikan(sesi.id)} className="btn btn-secondary btn-sm">
                            <CheckCircle2 size={14} /> Selesaikan
                          </button>
                          <Link href={`/opname/${sesi.id}`} className="btn btn-primary btn-sm">
                            <Scan size={14} /> Buka Scan <ChevronRight size={14} />
                          </Link>
                        </>
                      )}
                      {sesi.status === 'selesai' && (
                        <Link href={`/opname/${sesi.id}`} className="btn btn-secondary btn-sm">
                          <ClipboardList size={14} /> Lihat Detail <ChevronRight size={14} />
                        </Link>
                      )}
                      <button onClick={() => hapusSesi(sesi.id)} className="btn btn-ghost btn-sm">
                        <X size={14} style={{ color: 'var(--red)' }} />
                      </button>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* Modal */}
      {showModal && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal" style={{ maxWidth: 500 }} onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <div className="modal-title">Buat Sesi Opname Baru</div>
              <button onClick={() => setShowModal(false)} className="btn btn-ghost btn-sm"><X size={16} /></button>
            </div>
            <form onSubmit={createSesi}>
              <div className="modal-body">
                <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                  <div className="form-group">
                    <label className="form-label">Nama Sesi *</label>
                    <input className="form-input" required value={form.nama_sesi}
                      onChange={(e) => setForm({ ...form, nama_sesi: e.target.value })}
                      placeholder="e.g. Opname Gudang Pusat Minggu Ini" />
                  </div>
                  <div className="form-grid form-grid-2">
                    <div className="form-group">
                      <label className="form-label">Cabang</label>
                      <select className="form-select" value={form.cabang_id}
                        onChange={(e) => setForm({ ...form, cabang_id: e.target.value })}>
                        <option value="">— Pilih cabang —</option>
                        {cabangList.map((c) => <option key={c.id} value={c.id}>[{c.kode_cabang}] {c.nama_cabang}</option>)}
                      </select>
                    </div>
                    <div className="form-group">
                      <label className="form-label">Tanggal</label>
                      <input type="date" className="form-input" value={form.tanggal}
                        onChange={(e) => setForm({ ...form, tanggal: e.target.value })} />
                    </div>
                  </div>
                  <div className="form-group">
                    <label className="form-label">Catatan</label>
                    <textarea className="form-input" rows={2} value={form.catatan}
                      onChange={(e) => setForm({ ...form, catatan: e.target.value })}
                      placeholder="Keterangan sesi opname..." />
                  </div>
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" onClick={() => setShowModal(false)} className="btn btn-secondary">Batal</button>
                <button type="submit" className="btn btn-primary"><Save size={15} /> Buat Sesi</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  )
}
