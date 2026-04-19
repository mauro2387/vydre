'use client'

import * as React from 'react'
import { cn } from '@/lib/utils'

function Progress({
  className,
  value,
  ...props
}: React.ComponentProps<'div'> & { value?: number }) {
  return (
    <div
      data-slot="progress"
      className={cn(
        'relative h-2 w-full overflow-hidden rounded-full bg-primary/20',
        className
      )}
      {...props}
    >
      <div
        className="h-full rounded-full bg-primary transition-all duration-300 ease-in-out"
        style={{ width: `${Math.min(Math.max(value ?? 0, 0), 100)}%` }}
      />
    </div>
  )
}

export { Progress }
