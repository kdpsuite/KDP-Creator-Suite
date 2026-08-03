import { getKdpOverlayZones, KDP_BLEED_IN } from '@/lib/kdpDimensions'

export function KdpSafeZoneOverlay({
  trimSize,
  withBleed = true,
  pageCount = 24,
  pageSide = 'right',
  className = '',
}) {
  const { trim, safe, trimLabel, margins } = getKdpOverlayZones(
    trimSize,
    withBleed,
    pageCount,
    pageSide
  )

  return (
    <div className={`absolute inset-0 pointer-events-none ${className}`} aria-hidden="true">
      {withBleed && (
        <div
          className="absolute border-2 border-dashed border-amber-500/80"
          style={{
            top: `${trim.top}%`,
            left: `${trim.left}%`,
            width: `${trim.width}%`,
            height: `${trim.height}%`,
          }}
        />
      )}

      <div
        className="absolute border-2 border-blue-500/90"
        style={{
          top: `${trim.top}%`,
          left: `${trim.left}%`,
          width: `${trim.width}%`,
          height: `${trim.height}%`,
        }}
      />

      <div
        className="absolute border-2 border-dashed border-emerald-500/90 bg-emerald-500/5"
        style={{
          top: `${safe.top}%`,
          left: `${safe.left}%`,
          width: `${safe.width}%`,
          height: `${safe.height}%`,
        }}
      />

      <div className="absolute bottom-2 left-2 right-2 flex flex-wrap gap-2 justify-center">
        <span className="text-[10px] px-2 py-0.5 rounded bg-background/90 border border-border/60 text-foreground">
          Trim: {trimLabel} ({pageSide})
        </span>
        {withBleed && (
          <span className="text-[10px] px-2 py-0.5 rounded bg-amber-500/10 border border-amber-500/40 text-amber-700 dark:text-amber-300">
            Bleed: {KDP_BLEED_IN}&quot; outer/top/bottom
          </span>
        )}
        <span className="text-[10px] px-2 py-0.5 rounded bg-emerald-500/10 border border-emerald-500/40 text-emerald-700 dark:text-emerald-300">
          Inside {margins.inside}&quot; / outside {margins.outside}&quot;
        </span>
      </div>
    </div>
  )
}
