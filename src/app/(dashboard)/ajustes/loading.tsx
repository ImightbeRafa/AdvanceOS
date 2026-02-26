export default function Loading() {
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="space-y-2">
        <div className="h-8 w-48 animate-pulse rounded-lg bg-muted/50" />
        <div className="h-4 w-72 animate-pulse rounded-lg bg-muted/50" />
      </div>
      {/* Form card skeletons */}
      <div className="space-y-4">
        <div className="h-48 w-full animate-pulse rounded-lg bg-muted/50" />
        <div className="h-48 w-full animate-pulse rounded-lg bg-muted/50" />
      </div>
    </div>
  )
}
