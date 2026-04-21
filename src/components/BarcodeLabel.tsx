'use client'

import { useRef, useEffect } from 'react'
import JsBarcode from 'jsbarcode'

interface BarcodeDisplayProps {
  value: string
  height?: number
  fontSize?: number
}

export function BarcodeDisplay({ value, height = 60, fontSize = 12 }: BarcodeDisplayProps) {
  const svgRef = useRef<SVGSVGElement>(null)

  useEffect(() => {
    if (svgRef.current && value) {
      try {
        JsBarcode(svgRef.current, value, {
          format: 'CODE128',
          height,
          fontSize,
          margin: 8,
          background: 'transparent',
          lineColor: '#000',
          displayValue: true,
          font: 'JetBrains Mono, monospace',
        })
      } catch {
        // invalid barcode value
      }
    }
  }, [value, height, fontSize])

  return <svg ref={svgRef} style={{ width: '100%' }} />
}

interface BarcodeLabelProps {
  barcode: string
  title: string
  subtitle?: string
  extra?: string
  type?: 'coli' | 'pasang' | 'unit'
}

const TYPE_COLOR: Record<string, string> = {
  coli: '#3b82f6',
  pasang: '#a855f7',
  unit: '#22c55e',
}

const TYPE_LABEL: Record<string, string> = {
  coli: 'COLI',
  pasang: 'PASANG',
  unit: 'UNIT',
}

export function BarcodeLabel({ barcode, title, subtitle, extra, type = 'coli' }: BarcodeLabelProps) {
  const svgRef = useRef<SVGSVGElement>(null)
  const color = TYPE_COLOR[type]
  const label = TYPE_LABEL[type]

  useEffect(() => {
    if (svgRef.current && barcode) {
      try {
        JsBarcode(svgRef.current, barcode, {
          format: 'CODE128',
          height: 50,
          fontSize: 11,
          margin: 6,
          background: 'transparent',
          lineColor: '#111',
          displayValue: true,
          font: 'monospace',
        })
      } catch {
        // invalid
      }
    }
  }, [barcode])

  return (
    <div
      style={{
        background: 'white',
        color: '#111',
        padding: '12px 14px',
        borderRadius: '8px',
        width: '100%',
        fontFamily: 'monospace',
        border: `2px solid ${color}30`,
        position: 'relative',
      }}
    >
      <div
        style={{
          position: 'absolute',
          top: 8,
          right: 10,
          background: color,
          color: 'white',
          fontSize: '9px',
          fontWeight: 700,
          padding: '2px 6px',
          borderRadius: '4px',
          letterSpacing: '1px',
        }}
      >
        {label}
      </div>
      <div style={{ fontSize: '12px', fontWeight: 700, color: '#111', marginBottom: '2px' }}>
        {title}
      </div>
      {subtitle && (
        <div style={{ fontSize: '10px', color: '#555', marginBottom: '6px' }}>
          {subtitle}
        </div>
      )}
      <svg ref={svgRef} style={{ width: '100%', display: 'block' }} />
      {extra && (
        <div style={{ fontSize: '10px', color: '#666', textAlign: 'center', marginTop: '4px' }}>
          {extra}
        </div>
      )}
    </div>
  )
}
