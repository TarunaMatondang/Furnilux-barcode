'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  LayoutDashboard, Package, Scan, Barcode,
  ClipboardList, Boxes, Archive, Printer,
  Building2, Tag, Layers, Truck,
} from 'lucide-react'

const navItems = [
  {
    section: 'Utama',
    items: [
      { href: '/', label: 'Dashboard', icon: LayoutDashboard },
    ],
  },
  {
    section: 'Master Data',
    items: [
      { href: '/cabang', label: 'Cabang', icon: Building2 },
      { href: '/produk', label: 'Produk & Coli', icon: Package },
    ],
  },
  {
    section: 'Barcode',
    items: [
      { href: '/barcode/cetak-coli', label: 'Cetak Barcode Coli', icon: Printer },
      { href: '/barcode/cetak-unit', label: 'Cetak Barcode Unit', icon: Barcode },
    ],
  },
  {
    section: 'Aktivitas',
    items: [
      { href: '/opname', label: 'Sesi Opname', icon: ClipboardList },
      { href: '/distribusi', label: 'Scan Keluar', icon: Truck },
    ],
  },
  {
    section: 'Stok',
    items: [
      { href: '/stok', label: 'Ringkasan Stok', icon: Boxes },
      { href: '/stok/coli', label: 'Stok Coli', icon: Layers },
      { href: '/stok/pasang', label: 'Stok Pasang', icon: Archive },
      { href: '/stok/unit', label: 'Stok Unit', icon: Archive },
    ],
  },
]

export default function Sidebar() {
  const pathname = usePathname()
  const isActive = (href: string) => href === '/' ? pathname === '/' : pathname.startsWith(href)

  return (
    <aside className="sidebar">
      <div className="sidebar-header">
        <div className="sidebar-logo">
          <div className="sidebar-logo-icon">
            <Scan size={22} color="white" />
          </div>
          <div className="sidebar-logo-text">
            <span className="sidebar-logo-title">StockScan</span>
            <span className="sidebar-logo-sub">Sistem Gudang Barcode</span>
          </div>
        </div>
      </div>

      <nav className="sidebar-nav">
        {navItems.map((section) => (
          <div key={section.section}>
            <div className="nav-section-label">{section.section}</div>
            {section.items.map((item) => {
              const Icon = item.icon
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`nav-item ${isActive(item.href) ? 'active' : ''}`}
                >
                  <Icon className="nav-item-icon" size={18} />
                  {item.label}
                </Link>
              )
            })}
          </div>
        ))}
      </nav>

      <div style={{ padding: '16px 20px', borderTop: '1px solid var(--border)', fontSize: '11px', color: 'var(--text-muted)', textAlign: 'center' }}>
        v1.0.0 © 2025 StockScan
      </div>
    </aside>
  )
}
