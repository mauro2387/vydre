'use client'

import type { ReactNode } from 'react'
import type { LucideIcon } from 'lucide-react'

export function StatCard({
  label,
  value,
  subtitle,
  icon: Icon,
  iconBg,
  iconColor,
}: {
  label: string
  value: string | number
  subtitle?: string
  icon: LucideIcon
  iconBg: string
  iconColor: string
}) {
  return (
    <div
      className="group transition-all duration-200"
      style={{
        background: 'var(--card-bg)',
        border: '1px solid var(--card-border)',
        borderRadius: 'var(--card-radius)',
        padding: '20px 24px',
        boxShadow: 'var(--card-shadow)',
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.boxShadow = 'var(--card-shadow-hover)'
        e.currentTarget.style.transform = 'translateY(-1px)'
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.boxShadow = 'var(--card-shadow)'
        e.currentTarget.style.transform = 'translateY(0)'
      }}
    >
      <div className="flex items-center justify-between">
        <span
          style={{
            fontSize: '13px',
            fontWeight: 500,
            color: 'var(--text-tertiary)',
            textTransform: 'uppercase',
            letterSpacing: '0.5px',
          }}
        >
          {label}
        </span>
        <div
          className="flex items-center justify-center"
          style={{
            width: '36px',
            height: '36px',
            borderRadius: '10px',
            background: iconBg,
          }}
        >
          <Icon size={18} style={{ color: iconColor }} />
        </div>
      </div>
      <p
        style={{
          fontSize: '32px',
          fontWeight: 700,
          color: 'var(--text-primary)',
          marginTop: '12px',
          lineHeight: 1,
        }}
      >
        {value}
      </p>
      {subtitle && (
        <p style={{ fontSize: '13px', color: 'var(--text-tertiary)', marginTop: '4px' }}>
          {subtitle}
        </p>
      )}
    </div>
  )
}
