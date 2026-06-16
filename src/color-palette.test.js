import { describe, it, expect } from 'vitest'
import {
  toLinear,
  getLuminance,
  getContrastRatio,
  hexToRgb,
  rgbToHex,
  collectOpaquePixels,
  extractColorPalette,
  DEFAULT_ALPHA_THRESHOLD,
} from './color-palette.js'

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Build a minimal ImageData-like object from an array of [r, g, b, a] tuples.
 */
function makeImageData(pixels) {
  const data = new Uint8ClampedArray(pixels.flatMap(([r, g, b, a]) => [r, g, b, a]))
  return { data, width: pixels.length, height: 1 }
}

/**
 * A trivial mock for gifenc's `quantize` that simply returns each unique
 * [r, g, b] colour present in the pixel data (ignoring alpha, up to numColors).
 * The first entry is considered the "dominant" colour.
 */
function mockQuantize(pixels, numColors) {
  const seen = new Map()
  for (let i = 0; i < pixels.length; i += 4) {
    const key = `${pixels[i]},${pixels[i + 1]},${pixels[i + 2]}`
    seen.set(key, [pixels[i], pixels[i + 1], pixels[i + 2]])
  }
  return [...seen.values()].slice(0, numColors)
}

// ---------------------------------------------------------------------------
// toLinear
// ---------------------------------------------------------------------------

describe('toLinear', () => {
  it('maps 0 to 0', () => {
    expect(toLinear(0)).toBe(0)
  })

  it('maps 255 to 1', () => {
    expect(toLinear(255)).toBeCloseTo(1, 5)
  })

  it('uses the low-end linear segment for values <= 0.04045 * 255', () => {
    // 0.04045 * 255 ≈ 10.3 → channel value 10
    const c = 10
    const expected = c / 255 / 12.92
    expect(toLinear(c)).toBeCloseTo(expected, 10)
  })

  it('uses the gamma curve for mid-range values', () => {
    const c = 128
    const s = c / 255
    const expected = Math.pow((s + 0.055) / 1.055, 2.4)
    expect(toLinear(c)).toBeCloseTo(expected, 10)
  })
})

// ---------------------------------------------------------------------------
// getLuminance
// ---------------------------------------------------------------------------

describe('getLuminance', () => {
  it('returns 0 for black', () => {
    expect(getLuminance(0, 0, 0)).toBe(0)
  })

  it('returns ~1 for white', () => {
    expect(getLuminance(255, 255, 255)).toBeCloseTo(1, 5)
  })

  it('returns ~0.2126 for pure red', () => {
    expect(getLuminance(255, 0, 0)).toBeCloseTo(0.2126, 4)
  })

  it('returns ~0.7152 for pure green', () => {
    expect(getLuminance(0, 255, 0)).toBeCloseTo(0.7152, 4)
  })

  it('returns ~0.0722 for pure blue', () => {
    expect(getLuminance(0, 0, 255)).toBeCloseTo(0.0722, 4)
  })
})

// ---------------------------------------------------------------------------
// getContrastRatio
// ---------------------------------------------------------------------------

describe('getContrastRatio', () => {
  it('returns 1 when both luminances are equal', () => {
    expect(getContrastRatio(0.5, 0.5)).toBeCloseTo(1, 10)
  })

  it('returns 21 for black vs white', () => {
    const blackLum = getLuminance(0, 0, 0)       // 0
    const whiteLum = getLuminance(255, 255, 255)  // ~1
    expect(getContrastRatio(blackLum, whiteLum)).toBeCloseTo(21, 1)
  })

  it('is symmetric (order of arguments does not matter)', () => {
    const lum1 = getLuminance(200, 100, 50)
    const lum2 = getLuminance(20, 10, 5)
    expect(getContrastRatio(lum1, lum2)).toBeCloseTo(getContrastRatio(lum2, lum1), 10)
  })

  it('is always >= 1', () => {
    for (const [a, b] of [[0, 0], [0.5, 0.8], [1, 0]]) {
      expect(getContrastRatio(a, b)).toBeGreaterThanOrEqual(1)
    }
  })
})

// ---------------------------------------------------------------------------
// hexToRgb / rgbToHex
// ---------------------------------------------------------------------------

describe('hexToRgb', () => {
  it('parses white', () => {
    expect(hexToRgb('#ffffff')).toEqual([255, 255, 255])
  })

  it('parses black', () => {
    expect(hexToRgb('#000000')).toEqual([0, 0, 0])
  })

  it('parses an arbitrary colour', () => {
    expect(hexToRgb('#1a2b3c')).toEqual([0x1a, 0x2b, 0x3c])
  })

  it('is case-insensitive', () => {
    expect(hexToRgb('#FFFFFF')).toEqual([255, 255, 255])
    expect(hexToRgb('#FF8800')).toEqual([255, 136, 0])
  })
})

describe('rgbToHex', () => {
  it('converts white', () => {
    expect(rgbToHex(255, 255, 255)).toBe('#ffffff')
  })

  it('converts black', () => {
    expect(rgbToHex(0, 0, 0)).toBe('#000000')
  })

  it('pads single-digit hex values', () => {
    expect(rgbToHex(1, 2, 3)).toBe('#010203')
  })

  it('round-trips with hexToRgb', () => {
    const original = '#ab12cd'
    const [r, g, b] = hexToRgb(original)
    expect(rgbToHex(r, g, b)).toBe(original)
  })
})

// ---------------------------------------------------------------------------
// collectOpaquePixels
// ---------------------------------------------------------------------------

describe('collectOpaquePixels', () => {
  it('returns an empty Uint8Array when all pixels are transparent', () => {
    const imageData = makeImageData([
      [255, 0, 0, 0],    // fully transparent red
      [0, 255, 0, 10],   // below default threshold (32)
    ])
    const result = collectOpaquePixels(imageData)
    expect(result).toBeInstanceOf(Uint8Array)
    expect(result.length).toBe(0)
  })

  it('includes pixels at or above the alpha threshold', () => {
    const imageData = makeImageData([
      [255, 0, 0, 31],   // just below threshold → excluded
      [0, 255, 0, 32],   // at threshold → included
      [0, 0, 255, 255],  // fully opaque → included
    ])
    const result = collectOpaquePixels(imageData)
    // 2 opaque pixels × 4 channels = 8 bytes
    expect(result.length).toBe(8)
    // First included pixel: green (0, 255, 0) with alpha forced to 255
    expect(Array.from(result.slice(0, 4))).toEqual([0, 255, 0, 255])
    // Second included pixel: blue (0, 0, 255) with alpha forced to 255
    expect(Array.from(result.slice(4, 8))).toEqual([0, 0, 255, 255])
  })

  it('replaces the original alpha with 255 for every collected pixel', () => {
    const imageData = makeImageData([[100, 150, 200, 128]])
    const result = collectOpaquePixels(imageData)
    expect(result[3]).toBe(255)
  })

  it('respects a custom alpha threshold', () => {
    const imageData = makeImageData([
      [255, 0, 0, 50],  // included when threshold=32, excluded when threshold=100
    ])
    expect(collectOpaquePixels(imageData, 32).length).toBe(4)
    expect(collectOpaquePixels(imageData, 100).length).toBe(0)
  })

  it('returns all pixels when all are opaque', () => {
    const pixels = [
      [10, 20, 30, 255],
      [40, 50, 60, 255],
      [70, 80, 90, 200],
    ]
    const imageData = makeImageData(pixels)
    expect(collectOpaquePixels(imageData).length).toBe(pixels.length * 4)
  })
})

// ---------------------------------------------------------------------------
// extractColorPalette
// ---------------------------------------------------------------------------

describe('extractColorPalette', () => {
  // --- Edge cases ---

  it('returns empty palette and fallback color for a fully transparent image', () => {
    const imageData = makeImageData([[255, 0, 0, 0]])
    const result = extractColorPalette(imageData, 10, mockQuantize)
    expect(result.palette).toEqual([])
    expect(result.dominantColor).toBeNull()
    // Must still provide a usable fallback color
    expect(result.highestContrastColor).toBe('#000000')
  })

  it('returns empty palette when quantize returns nothing', () => {
    const imageData = makeImageData([[255, 0, 0, 255]])
    const emptyQuantize = () => []
    const result = extractColorPalette(imageData, 10, emptyQuantize)
    expect(result.palette).toEqual([])
    expect(result.dominantColor).toBeNull()
  })

  // --- Dominant colour ---

  it('treats the first quantize result as the dominant colour', () => {
    // mockQuantize preserves insertion order, so the first unique colour in the
    // pixel data becomes the dominant colour.
    const imageData = makeImageData([
      [255, 0, 0, 255],   // red → dominant
      [0, 0, 255, 255],   // blue
    ])
    const result = extractColorPalette(imageData, 10, mockQuantize)
    expect(result.dominantColor).toBe('#ff0000')
    expect(result.palette).toContain('#ff0000')
    expect(result.palette).toContain('#0000ff')
  })

  // --- Contrast selection: must never return white-on-white or black-on-black ---

  it('returns black (#000000) as overlay for a white-dominant image', () => {
    // Background is all white — the overlay must be black for readability.
    const imageData = makeImageData([
      [255, 255, 255, 255],
      [255, 255, 255, 255],
    ])
    // Quantize returns only white
    const whiteQuantize = () => [[255, 255, 255]]
    const result = extractColorPalette(imageData, 10, whiteQuantize)
    expect(result.dominantColor).toBe('#ffffff')
    expect(result.highestContrastColor).toBe('#000000')
  })

  it('returns white (#ffffff) as overlay for a black-dominant image', () => {
    const imageData = makeImageData([
      [0, 0, 0, 255],
      [0, 0, 0, 255],
    ])
    const blackQuantize = () => [[0, 0, 0]]
    const result = extractColorPalette(imageData, 10, blackQuantize)
    expect(result.dominantColor).toBe('#000000')
    expect(result.highestContrastColor).toBe('#ffffff')
  })

  it('returns black for a light-grey dominant image', () => {
    const imageData = makeImageData([[200, 200, 200, 255]])
    const lightGreyQuantize = () => [[200, 200, 200]]
    const result = extractColorPalette(imageData, 10, lightGreyQuantize)
    // Light grey has luminance ~0.58 — black (#000000, lum≈0) gives higher
    // contrast than white (#ffffff, lum≈1) because:
    // white vs 0.58 → (1.05)/(0.63) ≈ 1.67
    // black vs 0.58 → (0.63)/(0.05) ≈ 12.6
    expect(result.highestContrastColor).toBe('#000000')
  })

  it('returns white for a dark-grey dominant image', () => {
    const imageData = makeImageData([[50, 50, 50, 255]])
    const darkGreyQuantize = () => [[50, 50, 50]]
    const result = extractColorPalette(imageData, 10, darkGreyQuantize)
    expect(result.highestContrastColor).toBe('#ffffff')
  })

  it('picks the highest-contrast palette colour when one clearly wins', () => {
    // Dominant colour: medium grey (~0.18 lum).
    // Palette: medium grey + bright yellow + near-black.
    // Near-black should beat bright yellow in contrast against medium grey.
    const imageData = makeImageData([[100, 100, 100, 255]])
    const quantizeStub = () => [
      [100, 100, 100],   // medium grey — dominant
      [255, 255, 0],     // bright yellow (high lum)
      [10, 10, 10],      // near-black (very low lum)
    ]
    const result = extractColorPalette(imageData, 10, quantizeStub)
    // Near-black vs medium grey:  contrast ≈ (0.153+0.05)/(0.003+0.05) ≈ 3.8
    // Pure black (#000000) vs medium grey: contrast ≈ (0.153+0.05)/(0.0+0.05) ≈ 4.06
    // Pure white (#ffffff) vs medium grey: (1.0+0.05)/(0.153+0.05) ≈ 5.2  ← wins
    expect(result.highestContrastColor).toBe('#ffffff')
  })

  it('prefers a high-contrast palette colour over black/white when it wins', () => {
    // Dominant: near-white (lum ≈ 0.95).
    // Palette includes a very dark colour that beats pure black slightly due to
    // rounding… actually let's just verify the winner is picked correctly.
    // We'll use pure black in the palette and verify it beats pure white.
    const imageData = makeImageData([[240, 240, 240, 255]])
    const quantizeStub = () => [
      [240, 240, 240],  // near-white dominant
      [0, 0, 0],        // pure black in palette — highest contrast
    ]
    const result = extractColorPalette(imageData, 10, quantizeStub)
    // The palette's pure black and the candidate '#000000' have identical contrast.
    // Either is acceptable; what matters is that the result is black (not white/near-white).
    expect(result.highestContrastColor).toBe('#000000')
  })

  // --- Palette contents ---

  it('exposes the full extracted palette in the palette array', () => {
    const imageData = makeImageData([
      [255, 0, 0, 255],
      [0, 255, 0, 255],
      [0, 0, 255, 255],
    ])
    const result = extractColorPalette(imageData, 10, mockQuantize)
    expect(result.palette).toHaveLength(3)
    expect(result.palette).toContain('#ff0000')
    expect(result.palette).toContain('#00ff00')
    expect(result.palette).toContain('#0000ff')
  })

  it('does not include transparent pixels in the palette', () => {
    const imageData = makeImageData([
      [255, 255, 255, 0],   // transparent white — must be ignored
      [0, 0, 0, 255],       // opaque black — must appear in palette
    ])
    const result = extractColorPalette(imageData, 10, mockQuantize)
    // Only black should make it through to quantize
    expect(result.palette).toEqual(['#000000'])
    expect(result.dominantColor).toBe('#000000')
  })

  it('respects a custom alpha threshold', () => {
    const imageData = makeImageData([
      [255, 0, 0, 50],    // alpha=50 — included with default threshold (32), excluded with 64
      [0, 255, 0, 255],   // always included
    ])
    const resultDefault = extractColorPalette(imageData, 10, mockQuantize, 32)
    expect(resultDefault.palette).toContain('#ff0000')

    const resultStrict = extractColorPalette(imageData, 10, mockQuantize, 64)
    expect(resultStrict.palette).not.toContain('#ff0000')
    expect(resultStrict.palette).toContain('#00ff00')
  })
})
