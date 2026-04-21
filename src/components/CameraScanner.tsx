'use client'

import { useEffect, useRef, useState } from 'react'
import { Html5Qrcode, Html5QrcodeSupportedFormats } from 'html5-qrcode'
import { X, Camera } from 'lucide-react'

interface Props {
  onScan: (code: string) => void
  onClose: () => void
}

export default function CameraScanner({ onScan, onClose }: Props) {
  const scannerRef = useRef<Html5Qrcode | null>(null)
  const [errorMsg, setErrorMsg] = useState('')

  useEffect(() => {
    let unmounted = false
    const scanner = new Html5Qrcode("reader")
    scannerRef.current = scanner

    scanner.start(
      { facingMode: "environment" }, // Kamera belakang
      {
        fps: 10,
        qrbox: { width: 280, height: 120 } // Dimensi landscape cocok untuk barcode CODE128
      },
      (decodedText) => {
        if (unmounted) return
        onScan(decodedText)
        // Kita tidak langsung menutup, kita berikan data ke parent.
        // Parent yang akan render ulang atau menutup scanner ini.
      },
      () => {
        // Abaikan error terus menerus yang terjadi ketika tidak ada barcode tertangkap
      }
    ).catch(err => {
      if (!unmounted) setErrorMsg('Oops! Gagal mengakses kamera. Pastikan memberikan izin akses kamera atau cek apakah kamera sedang digunakan aplikasi lain.')
    })

    return () => {
      unmounted = true
      if (scannerRef.current?.isScanning) {
        scannerRef.current.stop().catch(() => {}).finally(() => {
          scannerRef.current?.clear()
        })
      }
    }
  }, [onScan])

  return (
    <div style={{ 
      position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, 
      background: 'rgba(0,0,0,0.85)', zIndex: 9999, 
      display: 'flex', alignItems: 'center', justifyContent: 'center' 
    }}>
      <div className="card" style={{ width: '95%', maxWidth: 420, background: '#111827', border: '1px solid var(--border)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '16px 20px', borderBottom: '1px solid rgba(255,255,255,0.1)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, color: 'white', fontWeight: 600 }}>
            <Camera size={18} /> Scanner Kamera
          </div>
          <button onClick={onClose} className="btn-ghost" style={{ padding: 6, borderRadius: 6, color: 'var(--text-muted)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <X size={20} />
          </button>
        </div>
        
        <div style={{ padding: 20 }}>
          {errorMsg && (
            <div style={{ color: 'var(--red)', fontSize: '13px', background: 'var(--red-bg)', border: '1px solid rgba(239, 68, 68, 0.3)', padding: 12, borderRadius: 6, marginBottom: 16 }}>
              {errorMsg}
            </div>
          )}
          
          <div style={{ position: 'relative', width: '100%', background: '#000', borderRadius: 8, overflow: 'hidden' }}>
            <div id="reader" style={{ width: '100%', border: 'none' }}></div>
          </div>
          
          <div style={{ marginTop: 16, fontSize: '13px', color: 'var(--text-muted)', textAlign: 'center', lineHeight: 1.5 }}>
            Arahkan garis batas ke barcode kardus.<br/>
            Pastikan lingkungan cukup terang.
          </div>
        </div>
      </div>
    </div>
  )
}
