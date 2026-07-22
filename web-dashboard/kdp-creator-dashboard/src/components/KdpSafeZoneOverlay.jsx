import { getKdpOverlayZones, KDP_BLEED_IN, KDP_SAFE_MARGIN_IN } from '@/lib/kdpDimensions'

export function KdpSafeZoneOverlay({ trimSize, withBleed = true, className = '' }) {
  const { trim, safe, trimLabel } = getKdpOverlayZones(trimSize, withBleed)

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
          Trim: {trimLabel}
        </span>
        {withBleed && (
          <span className="text-[10px] px-2 py-0.5 rounded bg-amber-500/10 border border-amber-500/40 text-amber-700 dark:text-amber-300">
            Bleed: {KDP_BLEED_IN}&quot;
          </span>
        )}
        <span className="text-[10px] px-2 py-0.5 rounded bg-emerald-500/10 border border-emerald-500/40 text-emerald-700 dark:text-emerald-300">
          Safe margin: {KDP_SAFE_MARGIN_IN}&quot;
        </span>
      </div>
    </div>
  )
}
