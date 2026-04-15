import { SkeletonCard } from '@/components/app/skeleton-card'

export default function DashboardLoading() {
  return (
    <div className="space-y-8">
      {/* Header skeleton */}
      <div className="space-y-2">
        <div className="h-8 w-64 animate-pulse rounded bg-muted" />
        <div className="h-5 w-48 animate-pulse rounded bg-muted" />
      </div>

      {/* Metrics skeleton — 3 cards */}
      <div className="grid gap-4 sm:grid-cols-3">
        {[1, 2, 3].map((i) => (
          <div key={i} className="rounded-xl border bg-card p-6">
            <div className="flex items-center gap-4">
              <div className="h-11 w-11 animate-pulse rounded-lg bg-muted" />
              <div className="space-y-2">
                <div className="h-8 w-12 animate-pulse rounded bg-muted" />
                <div className="h-4 w-24 animate-pulse rounded bg-muted" />
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Today's agenda skeleton — 5 rows */}
      <div className="space-y-3">
        <div className="h-6 w-32 animate-pulse rounded bg-muted" />
        {[1, 2, 3, 4, 5].map((i) => (
          <div key={i} className="rounded-xl border bg-card px-6 py-4">
            <div className="flex items-center gap-4">
              <div className="h-6 w-14 animate-pulse rounded bg-muted" />
              <div className="flex-1 space-y-2">
                <div className="h-4 w-40 animate-pulse rounded bg-muted" />
                <div className="h-3 w-16 animate-pulse rounded bg-muted" />
              </div>
              <div className="h-6 w-20 animate-pulse rounded-full bg-muted" />
            </div>
          </div>
        ))}
      </div>

      {/* Activity skeleton */}
      <div className="space-y-3">
        <div className="h-6 w-40 animate-pulse rounded bg-muted" />
        <SkeletonCard lines={4} />
      </div>
    </div>
  )
}
