export default function Loading() {
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="space-y-2">
        <div className="h-8 w-48 animate-pulse rounded-lg bg-muted/50" />
        <div className="h-4 w-72 animate-pulse rounded-lg bg-muted/50" />
      </div>
      {/* Metric cards grid 3x4 */}
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {Array.from({ length: 12 }).map((_, i) => (
          <div key={i} className="h-24 animate-pulse rounded-lg bg-muted/50" />
        ))}
      </div>
      {/* Table skeleton */}
      <div className="space-y-2">
        <div className="h-10 w-full animate-pulse rounded-lg bg-muted/50" />
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="h-12 w-full animate-pulse rounded-lg bg-muted/50" />
        ))}
      </div>
    </div>
  )
}
