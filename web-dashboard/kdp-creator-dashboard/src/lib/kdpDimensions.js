/** KDP print dimensions — mirrors backend src/services/kdp_specs.py */

export const KDP_TRIM_SIZES = {
  '5x8': { width: 5, height: 8 },
  '5.5x8.5': { width: 5.5, height: 8.5 },
  '6x9': { width: 6, height: 9 },
  '8.5x11': { width: 8.5, height: 11 },
}

/** Standard KDP bleed (inches) on outer/top/bottom for interiors */
export const KDP_BLEED_IN = 0.125

const MARGIN_TABLE = [
  { maxPages: 150, inside: 0.375, outsideNoBleed: 0.25, outsideWithBleed: 0.375 },
  { maxPages: 300, inside: 0.5, outsideNoBleed: 0.25, outsideWithBleed: 0.375 },
  { maxPages: 500, inside: 0.625, outsideNoBleed: 0.25, outsideWithBleed: 0.375 },
  { maxPages: 700, inside: 0.75, outsideNoBleed: 0.25, outsideWithBleed: 0.375 },
  { maxPages: 828, inside: 0.875, outsideNoBleed: 0.25, outsideWithBleed: 0.375 },
]

export function getTrimDimensions(trimSize) {
  return KDP_TRIM_SIZES[trimSize] ?? KDP_TRIM_SIZES['6x9']
}

export function getMargins(pageCount = 24, withBleed = false) {
  const count = Math.max(1, Number(pageCount) || 24)
  const row = MARGIN_TABLE.find((entry) => count <= entry.maxPages) || MARGIN_TABLE[MARGIN_TABLE.length - 1]
  const outside = withBleed ? row.outsideWithBleed : row.outsideNoBleed
  return {
    inside: row.inside,
    outside,
    top: outside,
    bottom: outside,
  }
}

/** @deprecated Use getMargins — kept for overlay badge fallback */
export const KDP_SAFE_MARGIN_IN = 0.25

export function getInteriorPageSize(trimSize, withBleed = false) {
  const trim = getTrimDimensions(trimSize)
  if (withBleed) {
    return {
      width: trim.width + KDP_BLEED_IN,
      height: trim.height + KDP_BLEED_IN * 2,
      trimWidth: trim.width,
      trimHeight: trim.height,
    }
  }
  return {
    width: trim.width,
    height: trim.height,
    trimWidth: trim.width,
    trimHeight: trim.height,
  }
}

/**
 * Percentage rects for overlay zones relative to the full page (with asymmetric bleed).
 * pageSide: 'right' (recto/odd) or 'left' (verso/even) for mirrored gutters.
 */
export function getKdpOverlayZones(trimSize, withBleed = true, pageCount = 24, pageSide = 'right') {
  const page = getInteriorPageSize(trimSize, withBleed)
  const margins = getMargins(pageCount, withBleed)
  const pageW = page.width
  const pageH = page.height

  let trimLeft = 0
  let trimRight = 0
  let trimTop = 0
  let trimBottom = 0
  if (withBleed) {
    trimTop = KDP_BLEED_IN
    trimBottom = KDP_BLEED_IN
    if (pageSide === 'right') {
      trimRight = KDP_BLEED_IN
    } else {
      trimLeft = KDP_BLEED_IN
    }
  }

  const trimRect = {
    top: (trimTop / pageH) * 100,
    left: (trimLeft / pageW) * 100,
    width: (page.trimWidth / pageW) * 100,
    height: (page.trimHeight / pageH) * 100,
  }

  const safeLeft =
    pageSide === 'right' ? trimLeft + margins.inside : trimLeft + margins.outside
  const safeRight =
    pageSide === 'right' ? trimRight + margins.outside : trimRight + margins.inside
  const safeTop = trimTop + margins.top
  const safeBottom = trimBottom + margins.bottom

  const safeRect = {
    top: (safeTop / pageH) * 100,
    left: (safeLeft / pageW) * 100,
    width: ((pageW - safeLeft - safeRight) / pageW) * 100,
    height: ((pageH - safeTop - safeBottom) / pageH) * 100,
  }

  return {
    trim: trimRect,
    safe: safeRect,
    trimLabel: `${page.trimWidth} × ${page.trimHeight} in`,
    margins,
    pageSide,
  }
}
