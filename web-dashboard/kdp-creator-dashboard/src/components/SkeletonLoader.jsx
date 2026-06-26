export function SkeletonLoader({ className = '', count = 1, variant = 'card' }) {
  if (variant === 'card') {
    return (
      <>
        {Array.from({ length: count }).map((_, i) => (
          <div
            key={i}
            className={`animate-pulse rounded-lg bg-gradient-to-r from-muted to-muted-foreground/20 p-6 ${className}`}
          >
            <div className="h-4 w-24 rounded bg-muted-foreground/30 mb-4" />
            <div className="space-y-3">
              <div className="h-3 w-full rounded bg-muted-foreground/30" />
              <div className="h-3 w-5/6 rounded bg-muted-foreground/30" />
              <div className="h-3 w-4/6 rounded bg-muted-foreground/30" />
            </div>
          </div>
        ))}
      </>
    )
  }

  if (variant === 'text') {
    return (
      <>
        {Array.from({ length: count }).map((_, i) => (
          <div key={i} className={`animate-pulse h-4 rounded bg-muted-foreground/30 ${className}`} />
        ))}
      </>
    )
  }

  if (variant === 'chart') {
    return (
      <div className={`animate-pulse rounded-lg bg-muted p-6 ${className}`}>
        <div className="h-64 w-full rounded bg-muted-foreground/20" />
      </div>
    )
  }

  return null
}
