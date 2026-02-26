export default function Loading() {
  return (
    <div className="space-y-6">
      {/* Back link skeleton */}
      <div className="h-5 w-24 animate-pulse rounded-lg bg-muted/50" />
      {/* Header with avatar + name */}
      <div className="flex items-center gap-4">
        <div className="h-16 w-16 shrink-0 animate-pulse rounded-full bg-muted/50" />
        <div className="space-y-2">
          <div className="h-7 w-48 animate-pulse rounded-lg bg-muted/50" />
          <div className="h-4 w-32 animate-pulse rounded-lg bg-muted/50" />
        </div>
      </div>
      {/* Tab bar */}
      <div className="flex gap-2">
        <div className="h-9 w-28 animate-pulse rounded-lg bg-muted/50" />
        <div className="h-9 w-28 animate-pulse rounded-lg bg-muted/50" />
        <div className="h-9 w-28 animate-pulse rounded-lg bg-muted/50" />
      </div>
      {/* Content area */}
      <div className="space-y-4">
        <div className="h-48 w-full animate-pulse rounded-lg bg-muted/50" />
        <div className="h-32 w-full animate-pulse rounded-lg bg-muted/50" />
      </div>
    </div>
  )
}
