import './style.css'
import '@fortawesome/fontawesome-free/css/all.min.css'

const iconSets = {
  solid: [
    'fa-a',
    'fa-address-book',
    'fa-address-card',
    'fa-alarm-clock',
    'fa-align-center',
    'fa-align-justify',
    'fa-align-left',
    'fa-align-right',
    'fa-anchor',
    'fa-anchor-circle-check',
    'fa-anchor-circle-exclamation',
    'fa-anchor-circle-xmark',
    'fa-anchor-lock',
    'fa-angle-down',
    'fa-angle-left',
    'fa-angle-right',
    'fa-angle-up',
    'fa-angles-down',
    'fa-angles-left',
    'fa-angles-right',
    'fa-angles-up',
    'fa-ankh',
    'fa-apple-whole',
    'fa-aquarius',
    'fa-archway',
    'fa-aries',
    'fa-arrow-down',
    'fa-arrow-down-1-9',
    'fa-arrow-down-9-1',
    'fa-arrow-down-a-z',
    'fa-arrow-down-long',
    'fa-arrow-down-short-wide',
    'fa-arrow-down-up-across-line',
    'fa-arrow-down-up-lock',
    'fa-arrow-down-wide-short',
    'fa-arrow-down-z-a',
    'fa-arrow-left',
    'fa-arrow-left-long',
    'fa-arrow-pointer',
    'fa-arrow-right',
    'fa-arrow-right-arrow-left',
    'fa-arrow-right-from-bracket',
    'fa-arrow-right-long',
    'fa-arrow-right-to-bracket',
    'fa-arrow-right-to-city',
    'fa-arrow-rotate-left',
    'fa-arrow-rotate-right',
    'fa-arrow-trend-down',
    'fa-arrow-trend-up',
    'fa-arrow-turn-down',
    'fa-arrow-turn-up',
    'fa-arrow-up',
    'fa-arrow-up-1-9',
    'fa-arrow-up-9-1',
    'fa-arrow-up-a-z',
    'fa-arrow-up-from-bracket',
    'fa-arrow-up-from-ground-water',
    'fa-arrow-up-from-water-pump',
    'fa-arrow-up-long',
    'fa-arrow-up-right-dots',
  ],
  regular: [
    'fa-address-book',
    'fa-address-card',
    'fa-alarm-clock',
    'fa-bell',
    'fa-bell-slash',
    'fa-bookmark',
    'fa-building',
    'fa-calendar',
    'fa-calendar-check',
    'fa-calendar-days',
    'fa-calendar-minus',
    'fa-calendar-plus',
    'fa-calendar-xmark',
    'fa-camera',
    'fa-chart-bar',
    'fa-chess-bishop',
    'fa-chess-king',
    'fa-chess-knight',
    'fa-chess-pawn',
    'fa-chess-queen',
    'fa-chess-rook',
    'fa-circle',
    'fa-circle-check',
    'fa-circle-dot',
    'fa-circle-down',
    'fa-circle-left',
    'fa-circle-pause',
    'fa-circle-play',
    'fa-circle-question',
    'fa-circle-right',
    'fa-circle-stop',
    'fa-circle-up',
    'fa-circle-user',
    'fa-circle-xmark',
    'fa-clipboard',
    'fa-clock',
    'fa-clone',
    'fa-closed-captioning',
    'fa-cloud',
    'fa-comment',
    'fa-comment-dots',
    'fa-comments',
    'fa-compass',
    'fa-copy',
    'fa-copyright',
    'fa-credit-card',
    'fa-envelope',
    'fa-envelope-open',
    'fa-eye',
    'fa-eye-slash',
    'fa-face-angry',
    'fa-face-dizzy',
    'fa-face-flushed',
    'fa-face-frown',
    'fa-face-frown-open',
    'fa-face-grimace',
    'fa-face-grin',
    'fa-face-grin-beam',
    'fa-face-grin-beam-sweat',
    'fa-face-grin-hearts',
  ],
  brands: [
    'fa-42-group',
    'fa-500px',
    'fa-accessible-icon',
    'fa-accusoft',
    'fa-adn',
    'fa-adversal',
    'fa-affiliatetheme',
    'fa-airbnb',
    'fa-algolia',
    'fa-alipay',
    'fa-amazon',
    'fa-amazon-pay',
    'fa-amilia',
    'fa-android',
    'fa-angellist',
    'fa-angrycreative',
    'fa-angular',
    'fa-app-store',
    'fa-app-store-ios',
    'fa-apper',
    'fa-apple',
    'fa-apple-pay',
    'fa-arch-linux',
    'fa-artstation',
    'fa-asymmetrik',
    'fa-atlassian',
    'fa-audible',
    'fa-autoprefixer',
    'fa-avianex',
    'fa-aviato',
    'fa-aws',
    'fa-bandcamp',
    'fa-battle-net',
    'fa-behance',
    'fa-bilibili',
    'fa-bimobject',
    'fa-bitbucket',
    'fa-bitcoin',
    'fa-bity',
    'fa-black-tie',
    'fa-blackberry',
    'fa-blogger',
    'fa-blogger-b',
    'fa-bluesky',
    'fa-bluetooth',
    'fa-bluetooth-b',
    'fa-board-game-geek',
    'fa-bootstrap',
    'fa-bots',
    'fa-brave',
    'fa-brave-reverse',
    'fa-btc',
    'fa-buffer',
    'fa-buromobelexperte',
    'fa-buy-n-large',
    'fa-buysellads',
    'fa-canadian-maple-leaf',
    'fa-cash-app',
    'fa-cc-amazon-pay',
    'fa-cc-amex',
  ],
}

const fontClassNames = {
  solid: 'fa-solid',
  regular: 'fa-regular',
  brands: 'fa-brands',
}

const defaultColors = ['#ffffff', '#22c55e']
const previewCount = 48
const previewIndexPoolSize = Math.min(...Object.values(iconSets).map((iconSet) => iconSet.length))

const state = {
  backgroundUrl: '',
  style: 'solid',
  offsetX: 0,
  offsetY: 0,
  size: 80,
  borderRadius: 4,
  borderSize: 0,
  borderColor: '#ffffff',
  colors: [...defaultColors],
  previewIndexes: [],
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

        <fieldset class="glyph-group">
          <legend>Border</legend>
          <div class="glyph-fields">
            <div class="glyph-field">
              <span>Radius</span>
              <input id="border-radius-range" type="range" min="0" max="100" step="1" value="4" />
              <input id="border-radius" type="number" min="0" max="100" step="1" value="4" />
            </div>
            <div class="glyph-field">
              <span>Size</span>
              <input id="border-size-range" type="range" min="0" max="20" step="1" value="0" />
              <input id="border-size" type="number" min="0" max="20" step="1" value="0" />
            </div>
            <label class="field">
              <span>Color</span>
              <input id="border-color" class="color-picker" type="color" value="#ffffff" aria-label="Border color" />
            </label>
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
          <h2>6×8 icon grid</h2>
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
  borderRadius: { range: document.querySelector('#border-radius-range'), number: document.querySelector('#border-radius') },
  borderSize: { range: document.querySelector('#border-size-range'), number: document.querySelector('#border-size') },
}
const borderColorInput = document.querySelector('#border-color')

function clampOffset(value) {
  return Math.max(-100, Math.min(100, Number(value) || 0))
}

function clampSize(value) {
  return Math.max(10, Math.min(100, Number(value) || 0))
}

function clampBorderRadius(value) {
  return Math.max(0, Math.min(100, Number(value) || 0))
}

function clampBorderSize(value) {
  return Math.max(0, Math.min(20, Number(value) || 0))
}

function getOverlayStyle() {
  const gradient = state.colors.length === 1
    ? state.colors[0]
    : `linear-gradient(135deg, ${state.colors.join(', ')})`

  const left = 50 + state.offsetX * 0.5
  const top = 50 + state.offsetY * 0.5

  return `--icon-left:${left}%;--icon-top:${top}%;--icon-size:${state.size}cqmin;--icon-fill:${gradient};`
}

function getCardStyle() {
  const borderStyle = `--card-border-radius:${state.borderRadius}%;--card-border-size:${state.borderSize};--card-border-color:${state.borderColor};`

  if (state.backgroundUrl) {
    return `${borderStyle}background-image:url('${state.backgroundUrl}');`
  }

  return `${borderStyle}background-image:linear-gradient(135deg, #0f172a, #1d4ed8 50%, #38bdf8);`
}

function rerollPreviewIcons() {
  const indexes = Array.from({ length: previewIndexPoolSize }, (_, index) => index)

  for (let index = indexes.length - 1; index > 0; index -= 1) {
    const randomIndex = Math.floor(Math.random() * (index + 1))
    const temporaryIndex = indexes[index]
    indexes[index] = indexes[randomIndex]
    indexes[randomIndex] = temporaryIndex
  }

  state.previewIndexes = indexes.slice(0, previewCount)
}

function renderPreview() {
  const fontClassName = fontClassNames[state.style]
  const icons = iconSets[state.style]
  const fragment = document.createDocumentFragment()

  for (let index = 0; index < previewCount; index += 1) {
    const card = document.createElement('article')
    card.className = 'preview-card'
    card.setAttribute('aria-label', `Preview tile ${index + 1}`)
    card.style.cssText = getCardStyle()

    const overlay = document.createElement('div')
    overlay.className = 'icon-overlay'
    overlay.style.cssText = getOverlayStyle()

    const icon = document.createElement('i')
    icon.className = `${fontClassName} ${icons[state.previewIndexes[index] % icons.length]} preview-icon`
    icon.setAttribute('aria-hidden', 'true')

    overlay.append(icon)
    card.append(overlay)
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
glyphInputs.borderRadius.range.addEventListener('input', (event) => syncGlyphInput('borderRadius', clampBorderRadius, event))
glyphInputs.borderRadius.number.addEventListener('input', (event) => syncGlyphInput('borderRadius', clampBorderRadius, event))
glyphInputs.borderSize.range.addEventListener('input', (event) => syncGlyphInput('borderSize', clampBorderSize, event))
glyphInputs.borderSize.number.addEventListener('input', (event) => syncGlyphInput('borderSize', clampBorderSize, event))

borderColorInput.addEventListener('input', (event) => {
  state.borderColor = event.target.value.toLowerCase()
  renderPreview()
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

rerollPreviewIcons()
renderColorFields()
renderPreview()
