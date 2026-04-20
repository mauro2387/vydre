import type { ReactNode } from 'react'

export function SectionHeader({
  title,
  badge,
  action,
}: {
  title: string
  badge?: number
  action?: ReactNode
}) {
  return (
    <div className="mb-4 flex items-center gap-3">
      <h2 style={{ fontSize: '16px', fontWeight: 600, color: 'var(--text-primary)' }}>
        {title}
      </h2>
      {badge !== undefined && (
        <span
          style={{
            background: '#EFF6FF',
            color: '#3B82F6',
            borderRadius: '20px',
            padding: '2px 10px',
            fontSize: '12px',
            fontWeight: 500,
          }}
        >
          {badge}
        </span>
      )}
      {action && <div className="ml-auto">{action}</div>}
    </div>
  )
}
