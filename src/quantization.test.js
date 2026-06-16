import { describe, expect, it } from 'vitest'
import { quantizeRgbaPixels } from './quantization.js'

describe('quantizeRgbaPixels', () => {
  it('returns an empty palette when no pixel data is provided', () => {
    expect(quantizeRgbaPixels(null, 8)).toEqual([])
    expect(quantizeRgbaPixels(new Uint8Array(), 8)).toEqual([])
  })

  it('returns at least one color even when numColors is invalid', () => {
    const pixels = new Uint8Array([
      255, 0, 0, 255,
      0, 255, 0, 255,
    ])

    const palette = quantizeRgbaPixels(pixels, 0)
    expect(palette.length).toBe(1)
  })

  it('returns a quantized palette for valid rgba data', () => {
    const pixels = new Uint8Array([
      255, 0, 0, 255,
      255, 0, 0, 255,
      0, 0, 255, 255,
      0, 0, 255, 255,
    ])

    const palette = quantizeRgbaPixels(pixels, 2)
    expect(palette).toHaveLength(2)
    expect(palette).toContainEqual([255, 0, 0])
    expect(palette).toContainEqual([0, 0, 255])
  })

  it('sorts palette colors by bucket frequency (most present first)', () => {
    const pixels = new Uint8Array([
      255, 0, 0, 255,
      255, 0, 0, 255,
      255, 0, 0, 255,
      0, 255, 0, 255,
      0, 255, 0, 255,
      0, 0, 255, 255,
    ])

    const palette = quantizeRgbaPixels(pixels, 3)
    expect(palette).toEqual([
      [255, 0, 0],
      [0, 255, 0],
      [0, 0, 255],
    ])
  })

  it('groups close colors in the same bucket before ranking by presence', () => {
    const pixels = new Uint8Array([
      200, 10, 10, 255,
      201, 12, 11, 255,
      205, 14, 10, 255,
      40, 220, 40, 255,
    ])

    const palette = quantizeRgbaPixels(pixels, 2)
    expect(palette).toHaveLength(2)
    expect(palette[0]).toEqual([202, 12, 10])
    expect(palette[1]).toEqual([40, 220, 40])
  })
})
