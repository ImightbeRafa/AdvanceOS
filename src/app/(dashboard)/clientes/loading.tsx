export default function Loading() {
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="space-y-2">
        <div className="h-8 w-48 animate-pulse rounded-lg bg-muted/50" />
        <div className="h-4 w-72 animate-pulse rounded-lg bg-muted/50" />
      </div>
      {/* Search bar */}
      <div className="h-10 w-full max-w-md animate-pulse rounded-lg bg-muted/50" />
      {/* Table skeleton */}
      <div className="space-y-2">
        <div className="h-10 w-full animate-pulse rounded-lg bg-muted/50" />
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="h-12 w-full animate-pulse rounded-lg bg-muted/50" />
        ))}
      </div>
    </div>
  )
}
