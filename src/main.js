import './style.css'
import '@fortawesome/fontawesome-free/css/all.min.css'

const iconSets = {
  solid: [
    'fa-star',
    'fa-heart',
    'fa-bolt',
    'fa-leaf',
    'fa-fire',
    'fa-gem',
    'fa-sun',
    'fa-cloud',
    'fa-music',
    'fa-camera',
    'fa-paper-plane',
    'fa-wand-magic-sparkles',
  ],
  regular: [
    'fa-star',
    'fa-heart',
    'fa-bell',
    'fa-bookmark',
    'fa-circle',
    'fa-comment',
    'fa-envelope',
    'fa-face-smile',
    'fa-gem',
    'fa-image',
    'fa-moon',
    'fa-paper-plane',
  ],
  brands: [
    'fa-github',
    'fa-gitlab',
    'fa-discord',
    'fa-docker',
    'fa-figma',
    'fa-html5',
    'fa-js',
    'fa-npm',
    'fa-react',
    'fa-vuejs',
    'fa-wordpress',
    'fa-x-twitter',
  ],
}

const fontClassNames = {
  solid: 'fa-solid',
  regular: 'fa-regular',
  brands: 'fa-brands',
}

const defaultColors = ['#ffffff', '#22c55e']
const previewCount = 12

const state = {
  backgroundUrl: '',
  style: 'solid',
  offsetX: 0,
  offsetY: 0,
  size: 80,
  colors: [...defaultColors],
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
              <input id="offset-y-range" type="range" min="-100" max="100" step="1" value="0" />
              <input id="offset-y" type="number" min="-100" max="100" step="1" value="0" />
            </div>
            <div class="glyph-field">
              <span>Size</span>
              <input id="glyph-size-range" type="range" min="10" max="100" step="1" value="80" />
              <input id="glyph-size" type="number" min="10" max="100" step="1" value="80" />
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
      </form>
    </section>

    <section class="panel preview-panel">
      <div class="preview-header">
        <div>
          <p class="eyebrow">Preview</p>
          <h2>3×4 icon grid</h2>
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
const glyphInputs = {
  offsetX: { range: document.querySelector('#offset-x-range'), number: document.querySelector('#offset-x') },
  offsetY: { range: document.querySelector('#offset-y-range'), number: document.querySelector('#offset-y') },
  size: { range: document.querySelector('#glyph-size-range'), number: document.querySelector('#glyph-size') },
}

function clampOffset(value) {
  return Math.max(-100, Math.min(100, Number(value) || 0))
}

function clampSize(value) {
  return Math.max(10, Math.min(100, Number(value) || 0))
}

function isValidHexColor(value) {
  return /^#([0-9a-f]{3}|[0-9a-f]{6})$/i.test(value)
}

function getRandomIcon(style) {
  const icons = iconSets[style]
  return icons[Math.floor(Math.random() * icons.length)]
}

function getOverlayStyle() {
  const gradient = state.colors.length === 1
    ? state.colors[0]
    : `linear-gradient(135deg, ${state.colors.join(', ')})`

  const left = 50 + state.offsetX * 0.5
  const top = 50 + state.offsetY * 0.5

  return `--icon-left:${left}%;--icon-top:${top}%;--icon-size:${state.size}cqmin;--icon-fill:${gradient};`
}

function getBackgroundStyle() {
  if (state.backgroundUrl) {
    return `background-image:url('${state.backgroundUrl}');`
  }

  return 'background-image:linear-gradient(135deg, #0f172a, #1d4ed8 50%, #38bdf8);'
}

function renderPreview() {
  const fontClassName = fontClassNames[state.style]

  previewGrid.innerHTML = Array.from({ length: previewCount }, (_, index) => `
    <article class="preview-card" aria-label="Preview tile ${index + 1}" style="${getBackgroundStyle()}">
      <div class="icon-overlay" style="${getOverlayStyle()}">
        <i class="${fontClassName} ${getRandomIcon(state.style)} preview-icon" aria-hidden="true"></i>
      </div>
    </article>
  `).join('')
}

function renderColorFields() {
  colorFields.innerHTML = state.colors
    .map(
      (color, index) => `
        <label class="field color-field">
          <span>Color ${index + 1}</span>
          <div class="color-input-row">
            <input class="color-picker" data-index="${index}" type="color" value="${color}" />
            <input class="color-text" data-index="${index}" type="text" value="${color}" aria-label="Hex color ${index + 1}" />
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
  const validColor = isValidHexColor(value) ? value : state.colors[index]
  state.colors[index] = validColor
  renderColorFields()
  renderPreview()
}

function normalizeColor(value) {
  const withHash = value.startsWith('#') ? value : `#${value}`
  return withHash.toLowerCase()
}

backgroundInput.addEventListener('change', (event) => {
  const [file] = event.target.files ?? []

  if (!file) {
    if (state.backgroundUrl) {
      URL.revokeObjectURL(state.backgroundUrl)
      state.backgroundUrl = ''
    }
    renderPreview()
    return
  }

  if (state.backgroundUrl) {
    URL.revokeObjectURL(state.backgroundUrl)
  }

  state.backgroundUrl = URL.createObjectURL(file)
  renderPreview()
})

styleSelect.addEventListener('change', (event) => {
  state.style = event.target.value
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

colorFields.addEventListener('change', (event) => {
  if (!event.target.classList.contains('color-text')) {
    return
  }

  const index = Number(event.target.dataset.index)

  if (Number.isNaN(index)) {
    return
  }

  syncColor(index, normalizeColor(event.target.value.trim()))
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
  renderPreview()
})

renderColorFields()
renderPreview()
