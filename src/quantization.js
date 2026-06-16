const MIN_COLOR_COUNT = 1
const MAX_CHANNEL_VALUE = 255
const RGBA_STRIDE = 4

function toColorCount(numColors) {
  if (!Number.isFinite(numColors)) {
    return MIN_COLOR_COUNT
  }

  return Math.max(MIN_COLOR_COUNT, Math.floor(numColors))
}

function toBucketBits(numColors) {
  const colorCount = toColorCount(numColors)
  const approximateDepth = Math.ceil(Math.log2(Math.cbrt(colorCount)))
  return Math.min(Math.max(approximateDepth, 1), 8)
}

function clampChannel(value) {
  return Math.min(Math.max(Math.round(value), 0), MAX_CHANNEL_VALUE)
}

/**
 * Quantize a flat RGBA byte array into an RGB palette.
 *
 * @param {Uint8Array|Uint8ClampedArray} pixels
 * @param {number} numColors
 * @returns {Array<[number, number, number]>}
 */
export function quantizeRgbaPixels(pixels, numColors) {
  if (!pixels || pixels.length < RGBA_STRIDE) {
    return []
  }

  const colorCount = toColorCount(numColors)
  const bucketBits = toBucketBits(colorCount)
  const bucketShift = 8 - bucketBits
  const buckets = new Map()
  const lastPixelStartIndex = pixels.length - RGBA_STRIDE

  for (let index = 0; index <= lastPixelStartIndex; index += RGBA_STRIDE) {
    const red = pixels[index]
    const green = pixels[index + 1]
    const blue = pixels[index + 2]
    const redBucket = red >> bucketShift
    const greenBucket = green >> bucketShift
    const blueBucket = blue >> bucketShift
    const bucketKey = (redBucket << (bucketBits * 2)) | (greenBucket << bucketBits) | blueBucket
    const bucket = buckets.get(bucketKey)

    if (bucket) {
      bucket.count += 1
      bucket.sumRed += red
      bucket.sumGreen += green
      bucket.sumBlue += blue
      continue
    }

    buckets.set(bucketKey, {
      key: bucketKey,
      count: 1,
      sumRed: red,
      sumGreen: green,
      sumBlue: blue,
    })
  }

  if (buckets.size === 0) {
    return []
  }

  return [...buckets.values()]
    .sort((left, right) => {
      if (right.count !== left.count) {
        return right.count - left.count
      }

      return left.key - right.key
    })
    .slice(0, colorCount)
    .map((bucket) => [
      clampChannel(bucket.sumRed / bucket.count),
      clampChannel(bucket.sumGreen / bucket.count),
      clampChannel(bucket.sumBlue / bucket.count),
    ])
}
