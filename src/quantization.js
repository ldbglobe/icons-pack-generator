import { quantize } from 'gifenc'

const MIN_COLOR_COUNT = 1

function toColorCount(numColors) {
  if (!Number.isFinite(numColors)) {
    return MIN_COLOR_COUNT
  }

  return Math.max(MIN_COLOR_COUNT, Math.floor(numColors))
}

/**
 * Quantize a flat RGBA byte array into an RGB palette.
 *
 * @param {Uint8Array|Uint8ClampedArray} pixels
 * @param {number} numColors
 * @returns {Array<[number, number, number]>}
 */
export function quantizeRgbaPixels(pixels, numColors) {
  if (!pixels || pixels.length < 4) {
    return []
  }

  return quantize(pixels, toColorCount(numColors))
}

