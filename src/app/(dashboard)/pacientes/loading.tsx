export default function PacientesLoading() {
  return (
    <div className="flex h-[calc(100vh-64px)] gap-6">
      {/* Left column — patient list skeleton */}
      <div className="w-[380px] shrink-0 space-y-4 max-md:w-full">
        <div className="flex items-center justify-between">
          <div className="space-y-1">
            <div className="h-6 w-24 animate-pulse rounded bg-muted" />
            <div className="h-4 w-20 animate-pulse rounded bg-muted" />
          </div>
          <div className="h-9 w-20 animate-pulse rounded-md bg-muted" />
        </div>
        <div className="h-9 animate-pulse rounded-md bg-muted" />
        <div className="space-y-1">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <div key={i} className="flex items-center gap-3 rounded-lg px-3 py-2.5">
              <div className="h-9 w-9 shrink-0 animate-pulse rounded-full bg-muted" />
              <div className="flex-1 space-y-1.5">
                <div className="h-4 w-32 animate-pulse rounded bg-muted" />
                <div className="h-3 w-24 animate-pulse rounded bg-muted" />
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Right column — detail skeleton (desktop only) */}
      <div className="hidden flex-1 items-center justify-center md:flex">
        <div className="text-center">
          <div className="mx-auto mb-4 h-16 w-16 animate-pulse rounded-full bg-muted" />
          <div className="mx-auto h-5 w-64 animate-pulse rounded bg-muted" />
        </div>
      </div>
    </div>
  )
}
