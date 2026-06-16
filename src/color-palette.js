/**
 * Color palette extraction utilities.
 *
 * Provides pure functions for extracting a color palette from image pixel data,
 * identifying the dominant color, and selecting the most readable (highest-contrast)
 * overlay color — all while ignoring transparent pixels.
 */

export const DEFAULT_ALPHA_THRESHOLD = 32
export const DEFAULT_PALETTE_SIZE = 10
export const PREVIEW_TILE_DARK_LUMINANCE_THRESHOLD = 0.2
export const PREVIEW_TILE_LIGHT_LUMINANCE_THRESHOLD = 0.8

const defaultPreviewTileBackdrop = {
  backgroundColor: '#ffffff',
  motifBase: '#d7d7d7',
  motifAccent: '#efefef',
}

const brightPreviewTileBackdrop = {
  backgroundColor: '#000000',
  motifBase: '#3f3f46',
  motifAccent: '#18181b',
}

/**
 * Convert a linear sRGB channel value (0–255) to its linearised counterpart.
 * @param {number} c - Channel value (0–255)
 * @returns {number}
 */
export function toLinear(c) {
  const s = c / 255
  return s <= 0.04045 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4)
}

/**
 * Compute WCAG relative luminance for an sRGB colour.
 * @param {number} r - Red   (0–255)
 * @param {number} g - Green (0–255)
 * @param {number} b - Blue  (0–255)
 * @returns {number} Relative luminance in [0, 1]
 */
export function getLuminance(r, g, b) {
  // ITU-R BT.709 coefficients
  return 0.2126 * toLinear(r) + 0.7152 * toLinear(g) + 0.0722 * toLinear(b)
}

/**
 * Compute the WCAG contrast ratio between two relative luminance values.
 * @param {number} lum1 - Relative luminance of first colour (0–1)
 * @param {number} lum2 - Relative luminance of second colour (0–1)
 * @returns {number} Contrast ratio in [1, 21]
 */
export function getContrastRatio(lum1, lum2) {
  const lighter = Math.max(lum1, lum2)
  const darker = Math.min(lum1, lum2)
  return (lighter + 0.05) / (darker + 0.05)
}

/**
 * Parse a 6-digit hex colour string into its RGB components.
 * @param {string} hex - e.g. "#ff8800"
 * @returns {[number, number, number]} [r, g, b] each in 0–255
 */
export function hexToRgb(hex) {
  const normalised = hex.toLowerCase()
  return [
    Number.parseInt(normalised.slice(1, 3), 16),
    Number.parseInt(normalised.slice(3, 5), 16),
    Number.parseInt(normalised.slice(5, 7), 16),
  ]
}

/**
 * Convert RGB components to a lowercase 6-digit hex string.
 * @param {number} r
 * @param {number} g
 * @param {number} b
 * @returns {string} e.g. "#ff8800"
 */
export function rgbToHex(r, g, b) {
  const toHex = (n) => n.toString(16).padStart(2, '0')
  return `#${toHex(r)}${toHex(g)}${toHex(b)}`
}

/**
 * Choose the preview tile backdrop theme that sits behind transparent
 * background-image pixels.
 *
 * Very dark dominant colours get a white backdrop; very bright dominant colours
 * get a black backdrop. Mid-range colours keep the default light checkerboard.
 *
 * @param {string | null} dominantColor
 * @param {number} [darkThreshold]
 * @param {number} [lightThreshold]
 * @returns {{
 *   backgroundColor: string,
 *   motifBase: string,
 *   motifAccent: string
 * }}
 */
export function getPreviewTileBackdrop(
  dominantColor,
  darkThreshold = PREVIEW_TILE_DARK_LUMINANCE_THRESHOLD,
  lightThreshold = PREVIEW_TILE_LIGHT_LUMINANCE_THRESHOLD,
) {
  if (!dominantColor) {
    return defaultPreviewTileBackdrop
  }

  const [red, green, blue] = hexToRgb(dominantColor)
  const luminance = getLuminance(red, green, blue)

  if (luminance >= lightThreshold) {
    return brightPreviewTileBackdrop
  }

  if (luminance <= darkThreshold) {
    return defaultPreviewTileBackdrop
  }

  return defaultPreviewTileBackdrop
}

/**
 * Collect non-transparent pixel data from an ImageData-like object.
 *
 * Returns a flat Uint8Array of [R, G, B, 255, R, G, B, 255, …] for every pixel
 * whose alpha channel is at or above `alphaThreshold`.  Transparent pixels are
 * discarded so that they do not pollute the quantisation result.
 *
 * @param {{ data: Uint8ClampedArray|Uint8Array }} imageData
 * @param {number} [alphaThreshold] - Minimum alpha to treat a pixel as opaque (0–255)
 * @returns {Uint8Array}
 */
export function collectOpaquePixels(imageData, alphaThreshold = DEFAULT_ALPHA_THRESHOLD) {
  const result = []

  for (let i = 0; i < imageData.data.length; i += 4) {
    if (imageData.data[i + 3] >= alphaThreshold) {
      result.push(imageData.data[i], imageData.data[i + 1], imageData.data[i + 2], 255)
    }
  }

  return new Uint8Array(result)
}

/**
 * Extract a colour palette from image pixel data, ignoring transparent pixels.
 *
 * @param {{ data: Uint8ClampedArray|Uint8Array, width: number, height: number }} imageData
 * @param {number} numColors - Number of colours to extract via quantisation
 * @param {(pixels: Uint8Array, numColors: number) => [number, number, number][]} quantizeFn
 *   Quantisation function (e.g. `quantize` from `gifenc`).  Receives a flat RGBA
 *   Uint8Array and the requested palette size; returns an array of [r, g, b] tuples
 *   ordered from most to least dominant.
 * @param {number} [alphaThreshold] - Minimum alpha to consider a pixel opaque
 *
 * @returns {{
 *   palette: string[],
 *   dominantColor: string | null,
 *   highestContrastColor: string
 * }}
 *   - `palette`              – Hex colours extracted from the image (opaque pixels only)
 *   - `dominantColor`        – The most dominant colour (first entry from the quantiser)
 *   - `highestContrastColor` – The colour from the extracted palette that best
 *                              contrasts with `dominantColor`.
 */
export function extractColorPalette(imageData, numColors, quantizeFn, alphaThreshold = DEFAULT_ALPHA_THRESHOLD) {
  const opaqueData = collectOpaquePixels(imageData, alphaThreshold)

  if (opaqueData.length === 0) {
    // No visible pixels — nothing to extract.
    return { palette: [], dominantColor: null, highestContrastColor: '#000000' }
  }

  const rawPalette = quantizeFn(opaqueData, numColors)

  if (!rawPalette || rawPalette.length === 0) {
    return { palette: [], dominantColor: null, highestContrastColor: '#000000' }
  }

  // rawPalette entries are [r, g, b] tuples ordered by dominance (most → least).
  const palette = rawPalette.map(([r, g, b]) => rgbToHex(r, g, b))
  const dominantColor = palette[0]

  const [domR, domG, domB] = hexToRgb(dominantColor)
  const dominantLuminance = getLuminance(domR, domG, domB)

  // Candidates: every colour in the palette
  const candidates = [...palette]
  let bestColor = '#000000'
  let bestContrast = 0

  for (const color of candidates) {
    const [r, g, b] = hexToRgb(color)
    const luminance = getLuminance(r, g, b)
    const contrast = getContrastRatio(dominantLuminance, luminance)

    if (contrast > bestContrast) {
      bestContrast = contrast
      bestColor = color
    }
  }

  return { palette, dominantColor, highestContrastColor: bestColor }
}
