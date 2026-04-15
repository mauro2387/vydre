import { Card, CardContent } from '@/components/ui/card'
import { cn } from '@/lib/utils'

export function SkeletonCard({
  lines = 3,
  showAvatar = false,
}: {
  lines?: number
  showAvatar?: boolean
}) {
  return (
    <Card>
      <CardContent className="flex gap-4 pt-6">
        {showAvatar && (
          <div className="h-10 w-10 shrink-0 animate-pulse rounded-full bg-muted" />
        )}
        <div className="flex-1 space-y-3">
          {Array.from({ length: lines }).map((_, i) => (
            <div
              key={i}
              className={cn(
                'h-4 animate-pulse rounded bg-muted',
                i === 0 && 'w-3/4',
                i === 1 && 'w-1/2',
                i >= 2 && 'w-5/6'
              )}
            />
          ))}
        </div>
      </CardContent>
    </Card>
  )
}
