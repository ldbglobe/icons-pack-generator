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
})

