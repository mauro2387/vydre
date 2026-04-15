export default function AgendaLoading() {
  return (
    <div className="space-y-6">
      {/* Week navigation skeleton */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="h-9 w-9 animate-pulse rounded-md bg-muted" />
          <div className="h-9 w-9 animate-pulse rounded-md bg-muted" />
          <div className="h-6 w-64 animate-pulse rounded bg-muted" />
        </div>
        <div className="h-9 w-16 animate-pulse rounded-md bg-muted" />
      </div>

      {/* Days skeleton — 3 days with 2-3 appointments each */}
      {[1, 2, 3].map((day) => (
        <div key={day} className="space-y-2">
          <div className="mb-3 flex items-center gap-2">
            <div className="h-5 w-28 animate-pulse rounded bg-muted" />
          </div>
          {Array.from({ length: day === 2 ? 3 : 2 }).map((_, i) => (
            <div key={i} className="rounded-xl border bg-card px-6 py-3">
              <div className="flex items-center gap-4">
                <div className="w-24 shrink-0">
                  <div className="h-4 w-20 animate-pulse rounded bg-muted" />
                </div>
                <div className="flex-1">
                  <div className="h-4 w-36 animate-pulse rounded bg-muted" />
                </div>
                <div className="h-6 w-20 animate-pulse rounded-full bg-muted" />
                <div className="h-8 w-8 animate-pulse rounded-md bg-muted" />
              </div>
            </div>
          ))}
          {day < 3 && <div className="mt-4 h-px bg-border" />}
        </div>
      ))}
    </div>
  )
}
