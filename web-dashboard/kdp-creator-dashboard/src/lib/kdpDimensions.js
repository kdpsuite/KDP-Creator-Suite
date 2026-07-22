/** KDP print dimensions (inches). Matches backend pdf_processing.KDP_TRIM_SIZES + common frontend options. */
export const KDP_TRIM_SIZES = {
  '6x9': { width: 6, height: 9 },
  '8.5x11': { width: 8.5, height: 11 },
  '5.5x8.5': { width: 5.5, height: 8.5 },
  '5x8': { width: 5, height: 8 },
}

/** Standard KDP bleed (inches) — matches backend BLEED_SIZE */
export const KDP_BLEED_IN = 0.125

/** Recommended minimum interior margin from trim edge (inches) */
export const KDP_SAFE_MARGIN_IN = 0.25

export function getTrimDimensions(trimSize) {
  return KDP_TRIM_SIZES[trimSize] ?? KDP_TRIM_SIZES['6x9']
}

/**
 * Percentage rects for overlay zones relative to the full page (with bleed when enabled).
 * Returns { trim, safe, bleedLabel } as { top, left, width, height } in %.
 */
export function getKdpOverlayZones(trimSize, withBleed = true) {
  const trim = getTrimDimensions(trimSize)
  const bleed = withBleed ? KDP_BLEED_IN : 0
  const margin = KDP_SAFE_MARGIN_IN

  const pageW = trim.width + bleed * 2
  const pageH = trim.height + bleed * 2

  const trimRect = {
    top: (bleed / pageH) * 100,
    left: (bleed / pageW) * 100,
    width: (trim.width / pageW) * 100,
    height: (trim.height / pageH) * 100,
  }

  const safeRect = {
    top: trimRect.top + (margin / pageH) * 100,
    left: trimRect.left + (margin / pageW) * 100,
    width: trimRect.width - (margin * 2 / pageW) * 100,
    height: trimRect.height - (margin * 2 / pageH) * 100,
  }

  return { trim: trimRect, safe: safeRect, trimLabel: trimSize.replace('x', ' × ') + ' in' }
}
