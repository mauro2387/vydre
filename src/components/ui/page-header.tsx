import type { ReactNode } from 'react'

export function PageHeader({
  title,
  subtitle,
  action,
}: {
  title: string
  subtitle?: string
  action?: ReactNode
}) {
  return (
    <div className="mb-6 flex items-start justify-between">
      <div>
        <h1 style={{ fontSize: '24px', fontWeight: 600, color: 'var(--text-primary)' }}>
          {title}
        </h1>
        {subtitle && (
          <p style={{ fontSize: '13px', color: 'var(--text-tertiary)', marginTop: '2px' }}>
            {subtitle}
          </p>
        )}
      </div>
      {action && <div>{action}</div>}
    </div>
  )
}
