export default function Loading() {
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="space-y-2">
        <div className="h-8 w-48 animate-pulse rounded-lg bg-muted/50" />
        <div className="h-4 w-72 animate-pulse rounded-lg bg-muted/50" />
      </div>
      {/* 2-column panels */}
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="h-64 animate-pulse rounded-lg bg-muted/50" />
        <div className="h-64 animate-pulse rounded-lg bg-muted/50" />
      </div>
    </div>
  )
}
