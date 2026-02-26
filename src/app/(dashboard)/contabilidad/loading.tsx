export default function Loading() {
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="space-y-2">
        <div className="h-8 w-48 animate-pulse rounded-lg bg-muted/50" />
        <div className="h-4 w-72 animate-pulse rounded-lg bg-muted/50" />
      </div>
      {/* Period selector bar */}
      <div className="flex gap-2">
        <div className="h-10 w-32 animate-pulse rounded-lg bg-muted/50" />
        <div className="h-10 w-32 animate-pulse rounded-lg bg-muted/50" />
        <div className="h-10 w-24 animate-pulse rounded-lg bg-muted/50" />
      </div>
      {/* 4-column metric cards (2 rows = 8 cards) */}
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: 8 }).map((_, i) => (
          <div key={i} className="h-24 animate-pulse rounded-lg bg-muted/50" />
        ))}
      </div>
      {/* 2-column panels */}
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="h-64 animate-pulse rounded-lg bg-muted/50" />
        <div className="h-64 animate-pulse rounded-lg bg-muted/50" />
      </div>
    </div>
  )
}
