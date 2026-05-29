import './style.css'
import '@fortawesome/fontawesome-free/css/all.min.css'
import iconSets from './icon-sets.json'
import JSZip from 'jszip'
import { GIFEncoder, applyPalette, quantize } from 'gifenc'

const defaultColors = ['#ffffff']

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
  exportProcessedCount: 0,
  exportTotalCount: 0,
  previewIcons: [],
  sortOrder: 'asc',
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
        <button id="sort-button" type="button" class="primary-button">A → Z</button>
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
const sortButton = document.querySelector('#sort-button')
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

const exportFontVariants = {
  solid: { family: '"Font Awesome 7 Free"', weight: '900' },
  regular: { family: '"Font Awesome 7 Free"', weight: '400' },
  brands: { family: '"Font Awesome 7 Brands"', weight: '400' },
}

function parseGlyphToken(token) {
  if (!token.startsWith('\\')) {
    // Literal character value (e.g., "A", "B", "!", etc.)
    return token
  }
  const rest = token.slice(1)
  const codePoint = Number.parseInt(rest, 16)
  if (Number.isNaN(codePoint)) {
    // Escaped non-hex character (e.g., \! → !)
    return rest.slice(0, 1)
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

function stripFaPrefix(iconClass) {
  return iconClass.startsWith('fa-') ? iconClass.slice(3) : iconClass
}

function getExportIconNames() {
  return iconSets[state.style]
    .filter((iconClass) => iconClass.startsWith('fa-'))
    .map(stripFaPrefix)
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
  if (!state.isExporting) {
    exportButton.textContent = 'Download icon pack ZIP'
    return
  }

  const total = state.exportTotalCount
  const processed = state.exportProcessedCount
  exportButton.textContent = total > 0 ? `Exporting… ${processed}/${total}` : 'Exporting…'
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
    const exportableIcons = icons.filter((iconName) => glyphMap.has(`fa-${iconName}`))
    const { family, weight } = exportFontVariants[state.style]
    const backgroundImage = state.backgroundUrl ? await loadImage(state.backgroundUrl) : null
    const exportFilenamePrefix = state.backgroundName ? `${state.backgroundName}-` : ''
    state.exportProcessedCount = 0
    state.exportTotalCount = exportableIcons.length
    updateExportButton()
    await document.fonts.load(`${weight} 100px ${family}`)

    const zip = new JSZip()
    for (const iconName of exportableIcons) {
      const glyph = glyphMap.get(`fa-${iconName}`)
      const iconBlob = await renderIconBlob({
        glyph,
        size: state.exportSize,
        format: state.exportFormat,
        backgroundImage,
      })
      zip.file(`${exportFilenamePrefix}${iconName}.${state.exportFormat}`, iconBlob)

      state.exportProcessedCount += 1
      if (state.exportTotalCount <= 10 || state.exportProcessedCount % 10 === 0) {
        updateExportButton()
      }
    }

    const archiveBlob = await zip.generateAsync({ type: 'blob' })
    const archiveUrl = URL.createObjectURL(archiveBlob)
    const link = document.createElement('a')
    link.href = archiveUrl
    link.download = `${exportFilenamePrefix}${state.style}-icon-pack-${state.exportFormat}-${state.exportSize}.zip`
    link.click()
    URL.revokeObjectURL(archiveUrl)
  } catch (error) {
    console.error(error)
    const message = error instanceof Error ? error.message : 'Unknown error'
    alert(`Export failed: ${message}`)
  } finally {
    state.isExporting = false
    state.exportProcessedCount = 0
    state.exportTotalCount = 0
    updateExportButton()
  }
}

function sortPreviewIcons() {
  const icons = [...iconSets[state.style]]
  if (state.sortOrder === 'asc') {
    icons.sort((a, b) => a.localeCompare(b))
  } else {
    icons.sort((a, b) => b.localeCompare(a))
  }
  state.previewIcons = icons
}

const previewTileSize = 64
let cachedGlyphMap = null
let previewRenderVersion = 0
let previewStructureKey = ''

function getPreviewStructureKey() {
  return `${state.style}:${state.sortOrder}`
}

function getPreviewGradient() {
  if (state.colors.length === 1) {
    return ''
  }
  const stopStep = 100 / Math.max(state.colors.length - 1, 1)
  const stops = state.colors.map((color, index) => `${color} ${Math.round(index * stopStep)}%`)
  return `linear-gradient(135deg, ${stops.join(', ')})`
}

function updatePreviewStyles() {
  const { family, weight } = exportFontVariants[state.style]
  const hasBackground = Boolean(state.backgroundUrl)
  const hasGradient = state.colors.length > 1
  const x = 50 + state.offsetX * 0.5
  const y = 50 + state.offsetY * 0.5
  const iconSizePixels = Math.max((previewTileSize * state.size) / 100, 0)

  previewGrid.style.setProperty('--preview-icon-font-family', family)
  previewGrid.style.setProperty('--preview-icon-font-weight', weight)
  previewGrid.style.setProperty('--preview-icon-size', `${iconSizePixels}px`)
  previewGrid.style.setProperty('--preview-icon-offset-x', `${x}%`)
  previewGrid.style.setProperty('--preview-icon-offset-y', `${y}%`)
  previewGrid.style.setProperty('--preview-icon-color', state.colors[0] ?? '#ffffff')
  previewGrid.style.setProperty('--preview-icon-gradient', getPreviewGradient())
  previewGrid.style.setProperty('--preview-background-image', hasBackground ? `url("${state.backgroundUrl}")` : 'none')
  previewGrid.classList.toggle('preview-grid--with-background', hasBackground)
  previewGrid.classList.toggle('preview-grid--transparent', !hasBackground)
  previewGrid.classList.toggle('preview-grid--gradient', hasGradient)
}

async function renderPreview() {
  const version = ++previewRenderVersion
  const { family, weight } = exportFontVariants[state.style]

  await document.fonts.load(`${weight} ${previewTileSize}px ${family}`)
  if (version !== previewRenderVersion) return

  if (!cachedGlyphMap) {
    cachedGlyphMap = getGlyphMap()
  }

  const glyphMap = cachedGlyphMap
  const structureKey = getPreviewStructureKey()

  if (previewStructureKey !== structureKey) {
    const totalIcons = state.previewIcons.length
    const fragment = document.createDocumentFragment()

    for (let index = 0; index < totalIcons; index += 1) {
      const iconClassName = state.previewIcons[index]
      const iconName = stripFaPrefix(iconClassName)
      const glyph = glyphMap.get(iconClassName) ?? ''

      const card = document.createElement('article')
      card.className = 'preview-card'
      card.setAttribute('aria-label', `Preview tile ${index + 1}`)

      const tile = document.createElement('div')
      tile.className = 'preview-tile'

      const glyphElement = document.createElement('span')
      glyphElement.className = 'preview-glyph'
      glyphElement.textContent = glyph
      glyphElement.setAttribute('aria-hidden', 'true')

      const name = document.createElement('p')
      name.className = 'preview-name'
      name.textContent = iconName

      tile.append(glyphElement)
      card.append(tile, name)
      fragment.append(card)
    }

    previewGrid.replaceChildren(fragment)
    previewStructureKey = structureKey
  }

  updatePreviewStyles()
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
  sortPreviewIcons()
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

sortButton.addEventListener('click', () => {
  state.sortOrder = state.sortOrder === 'asc' ? 'desc' : 'asc'
  sortButton.textContent = state.sortOrder === 'asc' ? 'A → Z' : 'Z → A'
  sortPreviewIcons()
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

sortPreviewIcons()
renderColorFields()
renderPreview()
updateExportButton()
