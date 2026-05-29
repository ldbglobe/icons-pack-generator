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
  padding: {
    top: 16,
    right: 16,
    bottom: 16,
    left: 16,
  },
  colors: [...defaultColors],
}

const app = document.querySelector('#app')

app.innerHTML = `
  <main class="layout">
    <section class="panel controls-panel">
      <div class="panel-heading">
        <p class="eyebrow">Issue #1</p>
        <h1>Basic icon pack interface</h1>
        <p class="lede">
          Upload a background, choose a free Font Awesome family, tune the icon padding,
          and preview a 3×4 grid of random glyph overlays.
        </p>
      </div>

      <form class="controls" aria-label="Icon pack controls">
        <label class="field file-field">
          <span>Background image</span>
          <input id="background-input" type="file" accept="image/*" />
        </label>

        <label class="field">
          <span>Font Awesome version</span>
          <select id="style-select">
            <option value="solid">Free Solid</option>
            <option value="regular">Free Regular</option>
            <option value="brands">Free Brands</option>
          </select>
        </label>

        <fieldset class="padding-group">
          <legend>Icon padding</legend>
          <div class="padding-grid">
            <label class="field">
              <span>Top</span>
              <input id="padding-top" type="number" min="0" max="96" step="1" value="16" />
            </label>
            <label class="field">
              <span>Right</span>
              <input id="padding-right" type="number" min="0" max="96" step="1" value="16" />
            </label>
            <label class="field">
              <span>Bottom</span>
              <input id="padding-bottom" type="number" min="0" max="96" step="1" value="16" />
            </label>
            <label class="field">
              <span>Left</span>
              <input id="padding-left" type="number" min="0" max="96" step="1" value="16" />
            </label>
          </div>
        </fieldset>

        <fieldset class="colors-group">
          <legend>Font icon colors</legend>
          <div id="color-fields" class="color-fields" aria-live="polite"></div>
          <div class="color-actions">
            <button id="add-color" type="button" class="secondary-button">Add color</button>
            <button id="reset-colors" type="button" class="secondary-button">Reset</button>
          </div>
          <p class="hint">Multiple colors render as a gradient to support duotone-style previews.</p>
        </fieldset>
      </form>
    </section>

    <section class="panel preview-panel">
      <div class="preview-header">
        <div>
          <p class="eyebrow">Preview</p>
          <h2>Randomized 12-cell grid</h2>
        </div>
        <button id="reroll-button" type="button" class="primary-button">Shuffle glyphs</button>
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
const paddingInputs = {
  top: document.querySelector('#padding-top'),
  right: document.querySelector('#padding-right'),
  bottom: document.querySelector('#padding-bottom'),
  left: document.querySelector('#padding-left'),
}

function clampPadding(value) {
  return Math.max(0, Math.min(96, Number(value) || 0))
}

function getRandomIcon(style) {
  const icons = iconSets[style]
  return icons[Math.floor(Math.random() * icons.length)]
}

function getOverlayStyle() {
  const padding = `${state.padding.top}px ${state.padding.right}px ${state.padding.bottom}px ${state.padding.left}px`
  const gradient = state.colors.length === 1
    ? state.colors[0]
    : `linear-gradient(135deg, ${state.colors.join(', ')})`

  return `padding:${padding};--icon-fill:${gradient};`
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
  const validColor = /^#([0-9a-f]{3}|[0-9a-f]{6})$/i.test(value) ? value : state.colors[index]
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

Object.entries(paddingInputs).forEach(([side, input]) => {
  input.addEventListener('input', (event) => {
    const nextValue = clampPadding(event.target.value)
    state.padding[side] = nextValue
    event.target.value = nextValue
    renderPreview()
  })
})

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
