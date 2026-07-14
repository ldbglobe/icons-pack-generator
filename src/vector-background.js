const shapeRadiusByValue = {
  square: '0%',
  'rounded-sm': '16%',
  'rounded-md': '28%',
  circle: '50%',
}

const borealisToneDefinitions = [
  { id: 'blue', label: 'Blue', base: '#2f6df6' },
  { id: 'green', label: 'Green', base: '#2da44e' },
  { id: 'grey', label: 'Grey', base: '#768294' },
  { id: 'orange', label: 'Orange', base: '#f76707' },
  { id: 'pink', label: 'Pink', base: '#e64980' },
  { id: 'purple', label: 'Purple', base: '#7c4dff' },
  { id: 'red', label: 'Red', base: '#e03131' },
  { id: 'yellow', label: 'Yellow', base: '#f59f00' },
]

function clampPercent(value, minimum, maximum) {
  const numericValue = Number(value)
  if (Number.isNaN(numericValue)) {
    return minimum
  }

  return Math.max(minimum, Math.min(maximum, numericValue))
}

function clampHexChannel(value) {
  return Math.max(0, Math.min(255, Math.round(value)))
}

function normalizeHexColor(value, fallback = '#ffffff') {
  const normalized = String(value ?? '').trim().toLowerCase()
  if (/^#[0-9a-f]{6}$/.test(normalized)) {
    return normalized
  }

  return fallback
}

function mixWithWhite(hex, ratio = 0.42) {
  const normalized = normalizeHexColor(hex)
  const red = Number.parseInt(normalized.slice(1, 3), 16)
  const green = Number.parseInt(normalized.slice(3, 5), 16)
  const blue = Number.parseInt(normalized.slice(5, 7), 16)
  const mix = clampPercent(ratio, 0, 1)

  const mixChannel = (channel) => clampHexChannel(channel + (255 - channel) * mix)
  const toHex = (channel) => channel.toString(16).padStart(2, '0')

  return `#${toHex(mixChannel(red))}${toHex(mixChannel(green))}${toHex(mixChannel(blue))}`
}

export const VECTOR_BACKGROUND_SHAPE_OPTIONS = [
  { value: 'square', label: 'Square', radius: shapeRadiusByValue.square },
  { value: 'rounded-sm', label: 'Rounded S', radius: shapeRadiusByValue['rounded-sm'] },
  { value: 'rounded-md', label: 'Rounded', radius: shapeRadiusByValue['rounded-md'] },
  { value: 'circle', label: 'Circle', radius: shapeRadiusByValue.circle },
]

export const DEFAULT_VECTOR_BACKGROUND_SETTINGS = {
  shape: 'circle',
  fillStart: '#2f6df6',
  fillEnd: '#9fd1ff',
  angle: 225,
  borderSize: 0,
  borderColor: '#ffffff',
  presetId: 'borealis-blue-gradient',
  presetLabel: 'Blue gradient',
}

export const VECTOR_BACKGROUND_PRESETS = borealisToneDefinitions.flatMap((tone) => {
  const lightTone = mixWithWhite(tone.base, 0.48)

  return [
    {
      id: `borealis-${tone.id}-gradient`,
      group: 'Gradient',
      label: `${tone.label} gradient`,
      shape: 'circle',
      fillStart: tone.base,
      fillEnd: lightTone,
      angle: 225,
      borderSize: 0,
      borderColor: '#ffffff',
      presetLabel: `${tone.label} gradient`,
    },
    {
      id: `borealis-${tone.id}-outline`,
      group: 'Outline',
      label: `${tone.label} outline`,
      shape: 'circle',
      fillStart: '#ffffff',
      fillEnd: '#ffffff',
      angle: 225,
      borderSize: 5,
      borderColor: tone.base,
      presetLabel: `${tone.label} outline`,
    },
  ]
})

const presetById = new Map(VECTOR_BACKGROUND_PRESETS.map((preset) => [preset.id, preset]))

export function getVectorBackgroundShapeRadius(shape) {
  return shapeRadiusByValue[shape] ?? shapeRadiusByValue.circle
}

export function getVectorBackgroundPreset(presetId) {
  return presetById.get(presetId) ?? null
}

export function normalizeVectorBackgroundSettings(settings = {}) {
  const shape = VECTOR_BACKGROUND_SHAPE_OPTIONS.some((option) => option.value === settings.shape)
    ? settings.shape
    : DEFAULT_VECTOR_BACKGROUND_SETTINGS.shape
  const fillStart = normalizeHexColor(settings.fillStart, DEFAULT_VECTOR_BACKGROUND_SETTINGS.fillStart)
  const fillEnd = normalizeHexColor(settings.fillEnd, fillStart)
  const angle = clampPercent(settings.angle ?? DEFAULT_VECTOR_BACKGROUND_SETTINGS.angle, 0, 360)
  const borderSize = clampPercent(settings.borderSize ?? DEFAULT_VECTOR_BACKGROUND_SETTINGS.borderSize, 0, 25)
  const borderColor = normalizeHexColor(settings.borderColor, DEFAULT_VECTOR_BACKGROUND_SETTINGS.borderColor)

  return {
    shape,
    fillStart,
    fillEnd,
    angle,
    borderSize,
    borderColor,
    presetId: String(settings.presetId ?? ''),
    presetLabel: String(settings.presetLabel ?? ''),
  }
}

export function getVectorBackgroundPresetSettings(presetId) {
  const preset = getVectorBackgroundPreset(presetId)
  if (!preset) {
    return null
  }

  return normalizeVectorBackgroundSettings(preset)
}

export function getVectorBackgroundCssVariables(settings, tileSize) {
  const normalized = normalizeVectorBackgroundSettings(settings)
  const borderSizePx = Math.round((Math.max(tileSize, 0) * normalized.borderSize) / 50)

  return {
    '--preview-vector-background-radius': getVectorBackgroundShapeRadius(normalized.shape),
    '--preview-vector-background-angle': `${normalized.angle}deg`,
    '--preview-vector-background-fill-start': normalized.fillStart,
    '--preview-vector-background-fill-end': normalized.fillEnd,
    '--preview-vector-background-border-width': `${borderSizePx}px`,
    '--preview-vector-background-border-color': normalized.borderColor,
  }
}

function getGradientEndpoints(size, angle) {
  const center = size / 2
  const half = size / 2
  const radians = ((angle - 90) * Math.PI) / 180
  const deltaX = Math.cos(radians) * half
  const deltaY = Math.sin(radians) * half

  return {
    x1: center - deltaX,
    y1: center - deltaY,
    x2: center + deltaX,
    y2: center + deltaY,
  }
}

function drawVectorShapePath(context, inset, size, shape) {
  const width = Math.max(size - inset * 2, 0)
  const height = width
  const left = inset
  const top = inset

  if (shape === 'square') {
    context.rect(left, top, width, height)
    return
  }

  if (shape === 'circle') {
    context.ellipse(left + width / 2, top + height / 2, width / 2, height / 2, 0, 0, Math.PI * 2)
    return
  }

  const radiusFraction = {
    'rounded-sm': 0.16,
    'rounded-md': 0.28,
    'rounded-lg': 0.38,
  }[shape] ?? 0.28
  const radius = Math.max(0, Math.min(width, height) * radiusFraction)

  if (typeof context.roundRect === 'function') {
    context.roundRect(left, top, width, height, radius)
    return
  }

  const right = left + width
  const bottom = top + height

  context.moveTo(left + radius, top)
  context.lineTo(right - radius, top)
  context.quadraticCurveTo(right, top, right, top + radius)
  context.lineTo(right, bottom - radius)
  context.quadraticCurveTo(right, bottom, right - radius, bottom)
  context.lineTo(left + radius, bottom)
  context.quadraticCurveTo(left, bottom, left, bottom - radius)
  context.lineTo(left, top + radius)
  context.quadraticCurveTo(left, top, left + radius, top)
}

function createVectorBackgroundFillStyle(context, size, settings) {
  if (settings.fillStart === settings.fillEnd) {
    return settings.fillStart
  }

  const { x1, y1, x2, y2 } = getGradientEndpoints(size, settings.angle)
  const gradient = context.createLinearGradient(x1, y1, x2, y2)
  gradient.addColorStop(0, settings.fillStart)
  gradient.addColorStop(1, settings.fillEnd)
  return gradient
}

export function drawVectorBackground(context, size, settings) {
  const normalized = normalizeVectorBackgroundSettings(settings)
  const borderSizePx = Math.max(0, (size * normalized.borderSize) / 50)
  const inset = Math.min(borderSizePx, size / 2)

  context.save()

  if (borderSizePx > 0) {
    context.beginPath()
    drawVectorShapePath(context, 0, size, normalized.shape)
    context.fillStyle = normalized.borderColor
    context.fill()

    const innerSize = Math.max(size - inset * 2, 0)
    if (innerSize > 0) {
      context.beginPath()
      drawVectorShapePath(context, inset, size, normalized.shape)
      context.fillStyle = createVectorBackgroundFillStyle(context, size, normalized)
      context.fill()
    }
  } else {
    context.beginPath()
    drawVectorShapePath(context, 0, size, normalized.shape)
    context.fillStyle = createVectorBackgroundFillStyle(context, size, normalized)
    context.fill()
  }

  context.restore()
}