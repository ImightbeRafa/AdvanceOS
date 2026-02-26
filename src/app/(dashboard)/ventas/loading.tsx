export default function Loading() {
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="space-y-2">
        <div className="h-8 w-48 animate-pulse rounded-lg bg-muted/50" />
        <div className="h-4 w-72 animate-pulse rounded-lg bg-muted/50" />
      </div>
      {/* 7-column KPI cards */}
      <div className="grid gap-3 grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-7">
        {Array.from({ length: 7 }).map((_, i) => (
          <div key={i} className="h-[72px] animate-pulse rounded-lg bg-muted/50" />
        ))}
      </div>
      {/* Tab bar */}
      <div className="flex gap-2">
        <div className="h-9 w-24 animate-pulse rounded-lg bg-muted/50" />
        <div className="h-9 w-24 animate-pulse rounded-lg bg-muted/50" />
        <div className="h-9 w-24 animate-pulse rounded-lg bg-muted/50" />
      </div>
      {/* Table skeleton */}
      <div className="space-y-2">
        <div className="h-10 w-full animate-pulse rounded-lg bg-muted/50" />
        {Array.from({ length: 8 }).map((_, i) => (
          <div key={i} className="h-12 w-full animate-pulse rounded-lg bg-muted/50" />
        ))}
      </div>
    </div>
  )
}
