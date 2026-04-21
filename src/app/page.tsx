'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import {
  Package,
  Layers,
  CheckCircle2,
  Archive,
  ClipboardList,
  TrendingUp,
  Scan,
  ChevronRight,
  Activity,
} from 'lucide-react'
import Link from 'next/link'

interface Stats {
  totalProduk: number
  totalColiTersedia: number
  totalPasang: number
  totalUnit: number
  opnameAktif: number
  scanHariIni: number
}

export default function DashboardPage() {
  const [stats, setStats] = useState<Stats>({
    totalProduk: 0,
    totalColiTersedia: 0,
    totalPasang: 0,
    totalUnit: 0,
    opnameAktif: 0,
    scanHariIni: 0,
  })
  const [recentScans, setRecentScans] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchStats()
    fetchRecentScans()
  }, [])

  async function fetchStats() {
    const today = new Date().toISOString().split('T')[0]

    const [
      { count: produk },
      { count: coli },
      { count: pasang },
      { count: unit },
      { count: opname },
      { count: scans },
    ] = await Promise.all([
      supabase.from('produk').select('*', { count: 'exact', head: true }),
      supabase.from('stok_coli').select('*', { count: 'exact', head: true }).eq('status', 'tersedia'),
      supabase.from('stok_pasang').select('*', { count: 'exact', head: true }).eq('status', 'tersedia'),
      supabase.from('stok_unit').select('*', { count: 'exact', head: true }).eq('status', 'tersedia'),
      supabase.from('opname_sesi').select('*', { count: 'exact', head: true }).eq('status', 'aktif'),
      supabase.from('opname_scan').select('*', { count: 'exact', head: true }).gte('scanned_at', `${today}T00:00:00`),
    ])

    setStats({
      totalProduk: produk ?? 0,
      totalColiTersedia: coli ?? 0,
      totalPasang: pasang ?? 0,
      totalUnit: unit ?? 0,
      opnameAktif: opname ?? 0,
      scanHariIni: scans ?? 0,
    })
    setLoading(false)
  }

  async function fetchRecentScans() {
    const { data } = await supabase
      .from('opname_scan')
      .select(`
        *,
        produk(nama_produk, kode_produk),
        produk_coli(nama_coli)
      `)
      .order('scanned_at', { ascending: false })
      .limit(8)

    setRecentScans(data ?? [])
  }

  const statCards = [
    {
      label: 'Total Produk',
      value: stats.totalProduk,
      icon: Package,
      color: 'var(--primary)',
      bg: 'var(--primary-glow)',
      href: '/produk',
    },
    {
      label: 'Coli Tersedia',
      value: stats.totalColiTersedia,
      icon: Layers,
      color: 'var(--cyan)',
      bg: 'var(--cyan-bg)',
      href: '/stok/coli',
    },
    {
      label: 'Pasang Tersedia',
      value: stats.totalPasang,
      icon: Archive,
      color: 'var(--purple)',
      bg: 'var(--purple-bg)',
      href: '/stok/pasang',
    },
    {
      label: 'Unit Tersedia',
      value: stats.totalUnit,
      icon: CheckCircle2,
      color: 'var(--green)',
      bg: 'var(--green-bg)',
      href: '/stok/unit',
    },
    {
      label: 'Opname Aktif',
      value: stats.opnameAktif,
      icon: ClipboardList,
      color: 'var(--yellow)',
      bg: 'var(--yellow-bg)',
      href: '/opname',
    },
    {
      label: 'Scan Hari Ini',
      value: stats.scanHariIni,
      icon: Activity,
      color: 'var(--orange)',
      bg: 'var(--orange-bg)',
      href: '/opname',
    },
  ]

  const BADGE_TYPE: Record<string, { cls: string; label: string }> = {
    coli: { cls: 'badge badge-blue', label: 'Coli' },
    pasang: { cls: 'badge badge-purple', label: 'Pasang' },
    unit: { cls: 'badge badge-green', label: 'Unit' },
  }

  return (
    <>
      {/* Topbar */}
      <div className="topbar">
        <div>
          <div className="topbar-title">Dashboard</div>
          <div className="topbar-breadcrumb">Ringkasan sistem stock opname gudang</div>
        </div>
        <Link href="/opname" className="btn btn-primary btn-sm">
          <Scan size={15} />
          Mulai Opname
        </Link>
      </div>

      <div className="page-content">
        {/* Hero Banner */}
        <div
          style={{
            background: 'linear-gradient(135deg, #1a2d6b 0%, #13161e 60%, #1a102b 100%)',
            border: '1px solid var(--border)',
            borderRadius: 'var(--radius-lg)',
            padding: '28px 32px',
            marginBottom: '24px',
            position: 'relative',
            overflow: 'hidden',
          }}
        >
          <div
            style={{
              position: 'absolute',
              top: -40,
              right: -40,
              width: 200,
              height: 200,
              borderRadius: '50%',
              background: 'rgba(79,127,255,0.08)',
            }}
          />
          <div
            style={{
              position: 'absolute',
              bottom: -60,
              right: 80,
              width: 160,
              height: 160,
              borderRadius: '50%',
              background: 'rgba(168,85,247,0.06)',
            }}
          />
          <div style={{ position: 'relative' }}>
            <div
              style={{
                fontSize: '22px',
                fontWeight: 800,
                color: 'var(--text-primary)',
                marginBottom: '6px',
                letterSpacing: '-0.5px',
              }}
            >
              Selamat datang di{' '}
              <span style={{ color: 'var(--primary)' }}>StockScan</span> 👋
            </div>
            <div style={{ fontSize: '14px', color: 'var(--text-secondary)', maxWidth: 500 }}>
              Sistem stock opname gudang berbasis barcode. Scan coli, bentuk pasang, dan kelola
              unit produk rakitan dengan mudah.
            </div>
          </div>
        </div>

        {/* Stat Cards */}
        <div className="stat-grid">
          {statCards.map((s) => {
            const Icon = s.icon
            return (
              <Link key={s.label} href={s.href}>
                <div className="stat-card" style={{ '--accent-color': s.color } as React.CSSProperties}>
                  <div
                    className="stat-icon"
                    style={{ background: s.bg, color: s.color }}
                  >
                    <Icon size={18} />
                  </div>
                  <div className="stat-label">{s.label}</div>
                  <div className="stat-value" style={{ color: s.color }}>
                    {loading ? '—' : s.value.toLocaleString('id-ID')}
                  </div>
                </div>
              </Link>
            )
          })}
        </div>

        {/* Quick Actions + Recent Scans */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1.5fr', gap: '20px' }}>
          {/* Quick Actions */}
          <div className="card">
            <div className="card-header">
              <div className="card-title">
                <TrendingUp size={16} />
                Aksi Cepat
              </div>
            </div>
            <div className="card-body" style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {[
                { href: '/produk', icon: Package, label: 'Tambah Produk Baru', color: 'var(--primary)' },
                { href: '/barcode/cetak-coli', icon: Scan, label: 'Cetak Barcode Coli', color: 'var(--cyan)' },
                { href: '/opname', icon: ClipboardList, label: 'Buka Sesi Opname', color: 'var(--yellow)' },
                { href: '/stok/unit', icon: CheckCircle2, label: 'Cetak Barcode Unit', color: 'var(--green)' },
              ].map((item) => {
                const Icon = item.icon
                return (
                  <Link key={item.href} href={item.href}>
                    <div
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        padding: '12px 14px',
                        background: 'var(--bg-input)',
                        borderRadius: 'var(--radius-sm)',
                        border: '1px solid var(--border)',
                        transition: 'all 0.2s',
                        cursor: 'pointer',
                      }}
                      className="stat-card"
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        <div
                          style={{
                            width: 32,
                            height: 32,
                            borderRadius: '8px',
                            background: `${item.color}15`,
                            color: item.color,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                          }}
                        >
                          <Icon size={16} />
                        </div>
                        <span style={{ fontSize: '13px', fontWeight: 500 }}>{item.label}</span>
                      </div>
                      <ChevronRight size={16} color="var(--text-muted)" />
                    </div>
                  </Link>
                )
              })}
            </div>
          </div>

          {/* Recent Scans */}
          <div className="card">
            <div className="card-header">
              <div className="card-title">
                <Activity size={16} />
                Scan Terbaru
              </div>
              <Link href="/opname" className="btn btn-ghost btn-sm">
                Lihat Semua <ChevronRight size={14} />
              </Link>
            </div>
            <div>
              {recentScans.length === 0 ? (
                <div className="empty-state">
                  <div className="empty-icon">
                    <Scan size={28} />
                  </div>
                  <div className="empty-title">Belum ada scan</div>
                  <div className="empty-desc">Mulai session opname untuk scan barcode coli</div>
                </div>
              ) : (
                <div className="table-wrapper">
                  <table className="table">
                    <thead>
                      <tr>
                        <th>Barcode</th>
                        <th>Produk</th>
                        <th>Tipe</th>
                        <th>Waktu</th>
                      </tr>
                    </thead>
                    <tbody>
                      {recentScans.map((scan) => {
                        const badge = BADGE_TYPE[scan.tipe] ?? { cls: 'badge badge-gray', label: scan.tipe }
                        return (
                          <tr key={scan.id}>
                            <td className="mono" style={{ color: 'var(--primary)' }}>
                              {scan.barcode}
                            </td>
                            <td style={{ fontSize: '13px' }}>
                              {scan.produk?.nama_produk ?? '—'}
                            </td>
                            <td>
                              <span className={badge.cls}>{badge.label}</span>
                            </td>
                            <td style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                              {new Date(scan.scanned_at).toLocaleTimeString('id-ID', {
                                hour: '2-digit',
                                minute: '2-digit',
                              })}
                            </td>
                          </tr>
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
    </>
  )
}
