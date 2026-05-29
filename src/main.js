import './style.css'
import '@fortawesome/fontawesome-free/css/all.min.css'
import iconSets from './icon-sets.json'
import JSZip from 'jszip'
import { GIFEncoder, applyPalette, quantize } from 'gifenc'

const fontClassNames = {
  solid: 'fa-solid',
  regular: 'fa-regular',
  brands: 'fa-brands',
}

const defaultColors = ['#ffffff']
const transparentTileDarkThreshold = 0.55
const maxRgbChannelValue = 255
const transparentTileStyles = {
  dark: '--transparent-base:#2f2f2f;--transparent-accent:#4a4a4a;',
  light: '--transparent-base:#d7d7d7;--transparent-accent:#efefef;',
}
const rgbBrightnessWeights = {
  red: 0.299,
  green: 0.587,
  blue: 0.114,
}

const state = {
  backgroundUrl: '',
  backgroundName: '',
  style: 'solid',
  offsetX: 0,
  offsetY: 20,
  size: 40,
  colors: [...defaultColors],
  exportFormat: 'png',
  exportSize: 512,
  isExporting: false,
  previewIcons: [],
}

const app = document.querySelector('#app')

app.innerHTML = `
  <main class="layout">
    <section class="panel controls-panel">
      <div class="panel-heading">
        <p class="eyebrow">Icons Pack Generator</p>
        <h1>Icon pack preview</h1>
      </div>

      <form class="controls" aria-label="Icon pack controls">
        <label class="field file-field">
          <span>Background image</span>
          <input id="background-input" type="file" accept="image/*" />
        </label>

        <label class="field">
          <span>Font Awesome style</span>
          <select id="style-select">
            <option value="solid">Free Solid</option>
            <option value="regular">Free Regular</option>
            <option value="brands">Free Brands</option>
          </select>
        </label>

        <fieldset class="glyph-group">
          <legend>Glyph position &amp; size</legend>
          <div class="glyph-fields">
            <div class="glyph-field">
              <span>X</span>
              <input id="offset-x-range" type="range" min="-100" max="100" step="1" value="0" />
              <input id="offset-x" type="number" min="-100" max="100" step="1" value="0" />
            </div>
            <div class="glyph-field">
              <span>Y</span>
              <input id="offset-y-range" type="range" min="-100" max="100" step="1" value="20" />
              <input id="offset-y" type="number" min="-100" max="100" step="1" value="20" />
            </div>
            <div class="glyph-field">
              <span>Size</span>
              <input id="glyph-size-range" type="range" min="0" max="100" step="1" value="40" />
              <input id="glyph-size" type="number" min="0" max="100" step="1" value="40" />
            </div>
          </div>
        </fieldset>

        <fieldset class="colors-group">
          <legend>Icon colors</legend>
          <div id="color-fields" class="color-fields" aria-live="polite"></div>
          <div class="color-actions">
            <button id="add-color" type="button" class="secondary-button">Add color</button>
            <button id="reset-colors" type="button" class="secondary-button">Reset</button>
          </div>
          <p class="hint">Multiple colors render as a gradient. Up to four colors.</p>
        </fieldset>

        <fieldset class="export-group">
          <legend>Export settings</legend>
          <div class="export-fields">
            <label class="field">
              <span>Format</span>
              <select id="export-format">
                <option value="png" selected>PNG (default)</option>
                <option value="jpg">JPG (non-transparent)</option>
                <option value="gif">GIF</option>
                <option value="webp">WEBP</option>
              </select>
            </label>
            <label class="field">
              <span>Size</span>
              <select id="export-size">
                <option value="128">128</option>
                <option value="256">256</option>
                <option value="512" selected>512 (default)</option>
              </select>
            </label>
          </div>
          <button id="export-button" type="button" class="primary-button export-button">Download icon pack ZIP</button>
        </fieldset>
      </form>
    </section>

    <section class="panel preview-panel">
      <div class="preview-header">
        <div>
          <p class="eyebrow">Preview</p>
          <h2>6-column glyph grid</h2>
        </div>
        <button id="reroll-button" type="button" class="primary-button">Shuffle</button>
      </div>
      <div id="preview-grid" class="preview-grid" aria-live="polite"></div>
    </section>
  </main>
`

const backgroundInput = document.querySelector('#background-input')
const styleSelect = document.querySelector('#style-select')
const previewGrid = document.querySelector('#preview-grid')
const colorFields = document.querySelector('#color-fields')
const addColorButton = document.querySelector('#add-color')
const resetColorsButton = document.querySelector('#reset-colors')
const rerollButton = document.querySelector('#reroll-button')
const exportFormatSelect = document.querySelector('#export-format')
const exportSizeSelect = document.querySelector('#export-size')
const exportButton = document.querySelector('#export-button')
const glyphInputs = {
  offsetX: { range: document.querySelector('#offset-x-range'), number: document.querySelector('#offset-x') },
  offsetY: { range: document.querySelector('#offset-y-range'), number: document.querySelector('#offset-y') },
  size: { range: document.querySelector('#glyph-size-range'), number: document.querySelector('#glyph-size') },
}

function clampOffset(value) {
  return Math.max(-100, Math.min(100, Number(value) || 0))
}

function clampSize(value) {
  return Math.max(0, Math.min(100, Number(value) || 0))
}

function parseHexColor(color) {
  const hex = color.replace('#', '')
  const fullHex = hex.length === 3
    ? hex
      .split('')
      .map((character) => `${character}${character}`)
      .join('')
    : hex

  if (fullHex.length !== 6) {
    return null
  }

  return {
    r: Number.parseInt(fullHex.slice(0, 2), 16),
    g: Number.parseInt(fullHex.slice(2, 4), 16),
    b: Number.parseInt(fullHex.slice(4, 6), 16),
  }
}

function getAverageGlyphBrightness() {
  const validColors = state.colors
    .map((color) => parseHexColor(color))
    .filter((color) => color !== null)

  if (!validColors.length) {
    return 0.5
  }

  const { red, green, blue } = validColors.reduce(
    (totals, color) => ({
      red: totals.red + color.r,
      green: totals.green + color.g,
      blue: totals.blue + color.b,
    }),
    { red: 0, green: 0, blue: 0 },
  )

  const colorCount = validColors.length
  const averageRed = red / colorCount
  const averageGreen = green / colorCount
  const averageBlue = blue / colorCount
  const averageBrightness = (
    rgbBrightnessWeights.red * averageRed
    + rgbBrightnessWeights.green * averageGreen
    + rgbBrightnessWeights.blue * averageBlue
  ) / maxRgbChannelValue
  return averageBrightness
}

function getOverlayStyle() {
  const gradient = state.colors.length === 1
    ? state.colors[0]
    : `linear-gradient(135deg, ${state.colors.join(', ')})`
  const left = 50 + state.offsetX * 0.5
  const top = 50 + state.offsetY * 0.5
  return `--icon-left:${left}%;--icon-top:${top}%;--icon-size:${state.size}cqmin;--icon-fill:${gradient};`
}

const exportFontVariants = {
  solid: { family: '"Font Awesome 7 Free"', weight: '900' },
  regular: { family: '"Font Awesome 7 Free"', weight: '400' },
  brands: { family: '"Font Awesome 7 Brands"', weight: '400' },
}

function parseGlyphToken(token) {
  const codePointHex = token.replace(/^\\/, '')
  const codePoint = Number.parseInt(codePointHex, 16)
  if (Number.isNaN(codePoint)) {
    return ''
  }

  return String.fromCodePoint(codePoint)
}

function getGlyphMap() {
  const glyphMap = new Map()

  for (const stylesheet of document.styleSheets) {
    let rules
    try {
      rules = stylesheet.cssRules
    } catch {
      continue
    }

    for (const rule of rules) {
      if (!(rule instanceof CSSStyleRule)) {
        continue
      }

      if (!rule.selectorText?.includes('.fa-')) {
        continue
      }

      const token = rule.style.getPropertyValue('--fa').trim().replaceAll('"', '').replaceAll("'", '')
      if (!token) {
        continue
      }

      const glyph = parseGlyphToken(token)
      if (!glyph) {
        continue
      }

      const classNames = rule.selectorText.match(/\.fa-[a-z0-9-]+/g) ?? []
      for (const className of classNames) {
        glyphMap.set(className.slice(1), glyph)
      }
    }
  }

  return glyphMap
}

function toSafeFilenamePart(value) {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
}

function getExportIconNames() {
  return iconSets[state.style]
    .filter((iconClass) => iconClass.startsWith('fa-'))
    .map((iconClass) => iconClass.slice(3))
    .sort((left, right) => left.localeCompare(right))
}

function createIconFill(context, size) {
  if (state.colors.length === 1) {
    return state.colors[0]
  }

  const gradient = context.createLinearGradient(size, 0, 0, size)
  const colorCount = state.colors.length - 1
  for (let index = 0; index < state.colors.length; index += 1) {
    gradient.addColorStop(index / colorCount, state.colors[index])
  }
  return gradient
}

function loadImage(url) {
  return new Promise((resolve, reject) => {
    const image = new Image()
    image.onload = () => resolve(image)
    image.onerror = () => reject(new Error(`Unable to load image: ${url}`))
    image.src = url
  })
}

function drawBackgroundImageCover(context, image, size) {
  const scale = Math.max(size / image.width, size / image.height)
  const width = image.width * scale
  const height = image.height * scale
  const x = (size - width) * 0.5
  const y = (size - height) * 0.5
  context.drawImage(image, x, y, width, height)
}

function canvasToBlob(canvas, mimeType, quality = 0.92) {
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (!blob) {
          reject(new Error(`Unable to export image: ${mimeType}`))
          return
        }
        resolve(blob)
      },
      mimeType,
      quality,
    )
  })
}

async function exportCanvasAsGif(canvas) {
  const context = canvas.getContext('2d')
  const { data } = context.getImageData(0, 0, canvas.width, canvas.height)
  const palette = quantize(data, 256)
  const index = applyPalette(data, palette)
  const gif = GIFEncoder()
  gif.writeFrame(index, canvas.width, canvas.height, { palette })
  gif.finish()
  return new Blob([gif.bytesView()], { type: 'image/gif' })
}

async function renderIconBlob({ glyph, size, format, backgroundImage }) {
  const { family, weight } = exportFontVariants[state.style]
  const canvas = document.createElement('canvas')
  canvas.width = size
  canvas.height = size
  const context = canvas.getContext('2d')

  if (format === 'jpg' && !backgroundImage) {
    context.fillStyle = '#ffffff'
    context.fillRect(0, 0, size, size)
  }

  if (backgroundImage) {
    drawBackgroundImageCover(context, backgroundImage, size)
  }

  const iconSize = Math.max(size * (state.size / 100), 1)
  const x = size * ((50 + state.offsetX * 0.5) / 100)
  const y = size * ((50 + state.offsetY * 0.5) / 100)

  context.font = `${weight} ${iconSize}px ${family}`
  context.textAlign = 'center'
  context.textBaseline = 'middle'
  context.fillStyle = createIconFill(context, size)
  context.fillText(glyph, x, y)

  if (format === 'gif') {
    return exportCanvasAsGif(canvas)
  }

  const mimeTypeByFormat = {
    jpg: 'image/jpeg',
    webp: 'image/webp',
    png: 'image/png',
  }
  const mimeType = mimeTypeByFormat[format] ?? 'image/png'
  return canvasToBlob(canvas, mimeType)
}

function updateExportButton() {
  exportButton.disabled = state.isExporting
  exportButton.textContent = state.isExporting ? 'Exporting…' : 'Download icon pack ZIP'
}

async function exportIconPack() {
  if (state.isExporting) {
    return
  }

  state.isExporting = true
  updateExportButton()

  try {
    const glyphMap = getGlyphMap()
    const icons = getExportIconNames()
    const { family, weight } = exportFontVariants[state.style]
    const backgroundImage = state.backgroundUrl ? await loadImage(state.backgroundUrl) : null
    const filenamePrefix = state.backgroundName ? `${state.backgroundName}-` : ''
    await document.fonts.load(`${weight} 100px ${family}`)

    const zip = new JSZip()
    for (const iconName of icons) {
      const glyph = glyphMap.get(`fa-${iconName}`)
      if (!glyph) {
        continue
      }

      const iconBlob = await renderIconBlob({
        glyph,
        size: state.exportSize,
        format: state.exportFormat,
        backgroundImage,
      })
      zip.file(`${filenamePrefix}${iconName}.${state.exportFormat}`, iconBlob)
    }

    const archiveBlob = await zip.generateAsync({ type: 'blob' })
    const archiveUrl = URL.createObjectURL(archiveBlob)
    const link = document.createElement('a')
    link.href = archiveUrl
    link.download = `${state.style}-icon-pack-${state.exportFormat}-${state.exportSize}.zip`
    link.click()
    URL.revokeObjectURL(archiveUrl)
  } catch (error) {
    console.error(error)
    const message = error instanceof Error ? error.message : 'Unknown error'
    alert(`Export failed: ${message}`)
  } finally {
    state.isExporting = false
    updateExportButton()
  }
}

function getCardStyle() {
  if (state.backgroundUrl) {
    return `background-image:url('${state.backgroundUrl}');`
  }

  const brightness = getAverageGlyphBrightness()
  if (brightness >= transparentTileDarkThreshold) {
    return transparentTileStyles.dark
  }

  return transparentTileStyles.light
}

function rerollPreviewIcons() {
  const icons = [...iconSets[state.style]]

  for (let index = icons.length - 1; index > 0; index -= 1) {
    const randomIndex = Math.floor(Math.random() * (index + 1))
    const temporaryIndex = icons[index]
    icons[index] = icons[randomIndex]
    icons[randomIndex] = temporaryIndex
  }

  state.previewIcons = icons
}

function renderPreview() {
  const fontClassName = fontClassNames[state.style]
  const totalIcons = state.previewIcons.length
  const fragment = document.createDocumentFragment()

  for (let index = 0; index < totalIcons; index += 1) {
    const iconClassName = state.previewIcons[index]
    const card = document.createElement('article')
    card.className = 'preview-card'
    card.setAttribute('aria-label', `Preview tile ${index + 1}`)

    const tile = document.createElement('div')
    tile.className = `preview-tile${state.backgroundUrl ? '' : ' preview-tile--transparent'}`
    tile.style.cssText = getCardStyle()

    const overlay = document.createElement('div')
    overlay.className = 'icon-overlay'
    overlay.style.cssText = getOverlayStyle()

    const icon = document.createElement('i')
    icon.className = `${fontClassName} ${iconClassName} preview-icon`
    icon.setAttribute('aria-hidden', 'true')

    const name = document.createElement('p')
    name.className = 'preview-name'
    name.textContent = iconClassName

    overlay.append(icon)
    tile.append(overlay)
    card.append(tile, name)
    fragment.append(card)
  }

  previewGrid.replaceChildren(fragment)
}

function renderColorFields() {
  colorFields.innerHTML = state.colors
    .map(
      (color, index) => `
        <label class="field color-field">
          <span>Color ${index + 1}</span>
          <div class="color-input-row">
            <input class="color-picker" data-index="${index}" type="color" value="${color}" aria-label="Icon color ${index + 1}" />
            <button
              type="button"
              class="icon-button"
              data-remove-color="${index}"
              ${state.colors.length === 1 ? 'disabled' : ''}
              aria-label="Remove color ${index + 1}"
            >
              ×
            </button>
          </div>
        </label>
      `,
    )
    .join('')
}

function syncColor(index, value) {
  state.colors[index] = value.toLowerCase()
  renderColorFields()
  renderPreview()
}

backgroundInput.addEventListener('change', (event) => {
  const [file] = event.target.files ?? []

  if (!file) {
    if (state.backgroundUrl) {
      URL.revokeObjectURL(state.backgroundUrl)
      state.backgroundUrl = ''
    }
    state.backgroundName = ''
    renderPreview()
    return
  }

  if (state.backgroundUrl) {
    URL.revokeObjectURL(state.backgroundUrl)
  }

  state.backgroundUrl = URL.createObjectURL(file)
  state.backgroundName = toSafeFilenamePart(file.name.replace(/\.[^.]*$/, ''))
  renderPreview()
})

styleSelect.addEventListener('change', (event) => {
  state.style = event.target.value
  state.previewIcons = [...iconSets[state.style]]
  renderPreview()
})

function syncGlyphInput(key, clampFn, event) {
  const nextValue = clampFn(event.target.value)
  state[key] = nextValue
  glyphInputs[key].range.value = nextValue
  glyphInputs[key].number.value = nextValue
  renderPreview()
}

glyphInputs.offsetX.range.addEventListener('input', (event) => syncGlyphInput('offsetX', clampOffset, event))
glyphInputs.offsetX.number.addEventListener('input', (event) => syncGlyphInput('offsetX', clampOffset, event))

glyphInputs.offsetY.range.addEventListener('input', (event) => syncGlyphInput('offsetY', clampOffset, event))
glyphInputs.offsetY.number.addEventListener('input', (event) => syncGlyphInput('offsetY', clampOffset, event))

glyphInputs.size.range.addEventListener('input', (event) => syncGlyphInput('size', clampSize, event))
glyphInputs.size.number.addEventListener('input', (event) => syncGlyphInput('size', clampSize, event))

colorFields.addEventListener('input', (event) => {
  if (!event.target.classList.contains('color-picker')) {
    return
  }

  const index = Number(event.target.dataset.index)

  if (Number.isNaN(index)) {
    return
  }

  syncColor(index, event.target.value)
})

colorFields.addEventListener('click', (event) => {
  const button = event.target.closest('[data-remove-color]')

  if (!button) {
    return
  }

  const index = Number(button.dataset.removeColor)
  state.colors = state.colors.filter((_, colorIndex) => colorIndex !== index)
  renderColorFields()
  renderPreview()
})

addColorButton.addEventListener('click', () => {
  if (state.colors.length >= 4) {
    return
  }

  state.colors = [...state.colors, '#f59e0b']
  renderColorFields()
  renderPreview()
})

resetColorsButton.addEventListener('click', () => {
  state.colors = [...defaultColors]
  renderColorFields()
  renderPreview()
})

rerollButton.addEventListener('click', () => {
  rerollPreviewIcons()
  renderPreview()
})

exportFormatSelect.addEventListener('change', (event) => {
  state.exportFormat = event.target.value
})

exportSizeSelect.addEventListener('change', (event) => {
  const value = Number.parseInt(event.target.value, 10)
  state.exportSize = [128, 256, 512].includes(value) ? value : 512
})

exportButton.addEventListener('click', () => {
  exportIconPack()
})

rerollPreviewIcons()
renderColorFields()
renderPreview()
updateExportButton()
