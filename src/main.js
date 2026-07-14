import './style.css'
import '@fortawesome/fontawesome-free/css/all.min.css'
import iconSets from './icon-sets.json'
import iconsIndex from './icons-index.json'
import JSZip from 'jszip'
import Fuse from 'fuse.js'
import { GIFEncoder, applyPalette } from 'gifenc'
import {
  extractColorPalette,
  DEFAULT_PALETTE_SIZE,
  getPreviewTileBackdrop,
} from './color-palette.js'
import {
  buildBackgroundAssetFilenamePart,
  buildSingleIconDownloadFilename,
  toSafeFilenamePart,
} from './download-filename.js'
import { quantizeRgbaPixels } from './quantization.js'
import {
  DEFAULT_VECTOR_BACKGROUND_SETTINGS,
  VECTOR_BACKGROUND_PRESETS,
  VECTOR_BACKGROUND_SHAPE_OPTIONS,
  drawVectorBackground,
  getVectorBackgroundCssVariables,
  getVectorBackgroundPresetSettings,
  normalizeVectorBackgroundSettings,
} from './vector-background.js'
import { registerSW } from 'virtual:pwa-register'

registerSW({ immediate: true })

const defaultColors = ['#ffffff']
const defaultExportSize = 128
const objectUrlRevokeDelayMs = 1000

const VIBRANT_COLORS = ['#ff0000', '#ff8c00', '#ffd700', '#00c800', '#00bcd4', '#2979ff', '#9c27b0', '#e91e63']
const PASTEL_COLORS  = ['#ffb3b3', '#ffd9b3', '#fff4b3', '#b3ffb3', '#b3f0ff', '#b3c8ff', '#d9b3ff', '#ffb3e6']
const MORANDI_COLORS = ['#b5a99a', '#9aaa9f', '#8fa3b1', '#b1978f', '#a8b19a', '#b09fac', '#c4b49b', '#8e9999']
const quickStartBackgroundModules = import.meta.glob('../assets/**/*.{avif,gif,jpeg,jpg,png,svg,webp}', {
  eager: true,
  import: 'default',
})

function renderVectorPresetButton(preset, index, totalCount) {
  return `
    <button
      type="button"
      class="vector-preset${state.vectorPresetId === preset.id ? ' is-active' : ''}"
      data-vector-preset="${preset.id}"
      aria-pressed="${state.vectorPresetId === preset.id}"
      aria-label="Select ${preset.label} preset, item ${index + 1} of ${totalCount}"
      title="${preset.label}"
      style="--vector-preset-fill-start: ${preset.fillStart}; --vector-preset-fill-end: ${preset.fillEnd}; --vector-preset-border-width: ${preset.borderSize}%; --vector-preset-border-color: ${preset.borderColor}; --vector-preset-radius: ${VECTOR_BACKGROUND_SHAPE_OPTIONS.find((option) => option.value === preset.shape)?.radius ?? '50%'}; --vector-preset-angle: ${preset.angle}deg;"
    >
      <span class="vector-preset-swatch"></span>
      <span class="vector-preset-name">${preset.label}</span>
    </button>
  `
}

function renderVectorPresetGroups() {
  const groups = [
    { label: 'Borealis gradients', name: 'Gradient' },
    { label: 'White border', name: 'Outline' },
  ]

  return groups
    .map((group) => {
      const presets = VECTOR_BACKGROUND_PRESETS.filter((preset) => preset.group === group.name)
      return `
        <section class="vector-preset-group" aria-label="${group.label}">
          <p class="vector-preset-group-title">${group.label}</p>
          <div class="vector-preset-grid">
            ${presets.map((preset, index) => renderVectorPresetButton(preset, index, presets.length)).join('')}
          </div>
        </section>
      `
    })
    .join('')
}

function renderVectorShapeOptions() {
  return VECTOR_BACKGROUND_SHAPE_OPTIONS.map(
    (option) => `<option value="${option.value}">${option.label}</option>`,
  ).join('')
}

function createFolderSampleUrl({ bodyTop, bodyBottom, tabTop, tabBottom, highlight }) {
  const svg = `
    <svg width="192" height="192" viewBox="0 0 192 192" fill="none" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="tab" x1="96" y1="24" x2="96" y2="72" gradientUnits="userSpaceOnUse">
          <stop stop-color="${tabTop}" />
          <stop offset="1" stop-color="${tabBottom}" />
        </linearGradient>
        <linearGradient id="body" x1="96" y1="48" x2="96" y2="168" gradientUnits="userSpaceOnUse">
          <stop stop-color="${bodyTop}" />
          <stop offset="1" stop-color="${bodyBottom}" />
        </linearGradient>
        <linearGradient id="shine" x1="96" y1="60" x2="96" y2="112" gradientUnits="userSpaceOnUse">
          <stop stop-color="${highlight}" stop-opacity="0.34" />
          <stop offset="1" stop-color="${highlight}" stop-opacity="0" />
        </linearGradient>
      </defs>
      <path d="M28 56C28 42.7452 38.7452 32 52 32H82.2299C88.5951 32 94.6996 34.5286 99.199 39.0294L112.971 52.8008C115.22 55.0506 118.271 56.3145 121.453 56.3145H140C153.255 56.3145 164 67.0596 164 80.3145V88H28V56Z" fill="url(#tab)"/>
      <path d="M24 80C24 66.7452 34.7452 56 48 56H144C157.255 56 168 66.7452 168 80V136C168 152.569 154.569 166 138 166H54C37.4315 166 24 152.569 24 136V80Z" fill="url(#body)"/>
      <path d="M30 86C30 73.8497 39.8497 64 52 64H140C152.15 64 162 73.8497 162 86V100H30V86Z" fill="url(#shine)"/>
      <path d="M96 42H132.5C136.39 42 140.05 43.8144 142.389 46.906L151.65 59.1475C154.305 62.6579 151.802 67.6667 147.4 67.6667H118.083C114.901 67.6667 111.851 66.4028 109.601 64.1529L89.5147 44.0666C87.9403 42.4922 89.0553 39.8 91.2822 39.8H94.4L96 42Z" fill="${highlight}" fill-opacity="0.92"/>
    </svg>
  `

  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`
}

const fallbackBackgroundSampleGroups = [
  {
    label: 'Blue',
    samples: [
      { id: 'blue-1', label: 'Blue 1', url: createFolderSampleUrl({ bodyTop: '#68c9ff', bodyBottom: '#2f85eb', tabTop: '#8fe0ff', tabBottom: '#4da8ff', highlight: '#ffffff' }) },
      { id: 'blue-2', label: 'Blue 2', url: createFolderSampleUrl({ bodyTop: '#74c0fc', bodyBottom: '#1864ab', tabTop: '#a5d8ff', tabBottom: '#4dabf7', highlight: '#f8fbff' }) },
      { id: 'blue-3', label: 'Blue 3', url: createFolderSampleUrl({ bodyTop: '#8ec5ff', bodyBottom: '#3b5bdb', tabTop: '#c5f6fa', tabBottom: '#74c0fc', highlight: '#ffffff' }) },
    ],
  },
  {
    label: 'Green',
    samples: [
      { id: 'green-1', label: 'Green 1', url: createFolderSampleUrl({ bodyTop: '#7ee787', bodyBottom: '#2da44e', tabTop: '#b7f5bd', tabBottom: '#56d364', highlight: '#f3fff2' }) },
      { id: 'green-2', label: 'Green 2', url: createFolderSampleUrl({ bodyTop: '#8ce99a', bodyBottom: '#2b8a3e', tabTop: '#d3f9d8', tabBottom: '#69db7c', highlight: '#fbfffd' }) },
      { id: 'green-3', label: 'Green 3', url: createFolderSampleUrl({ bodyTop: '#63e6be', bodyBottom: '#099268', tabTop: '#c3fae8', tabBottom: '#38d9a9', highlight: '#f5fffb' }) },
    ],
  },
  {
    label: 'Yellow',
    samples: [
      { id: 'yellow-1', label: 'Yellow 1', url: createFolderSampleUrl({ bodyTop: '#ffe066', bodyBottom: '#fab005', tabTop: '#fff3bf', tabBottom: '#ffd43b', highlight: '#fffef2' }) },
      { id: 'yellow-2', label: 'Yellow 2', url: createFolderSampleUrl({ bodyTop: '#fff089', bodyBottom: '#f59f00', tabTop: '#fff9db', tabBottom: '#fcc419', highlight: '#fffef5' }) },
      { id: 'yellow-3', label: 'Yellow 3', url: createFolderSampleUrl({ bodyTop: '#ffe8a1', bodyBottom: '#e67700', tabTop: '#fff4cc', tabBottom: '#ffd166', highlight: '#fffdf3' }) },
    ],
  },
  {
    label: 'Orange',
    samples: [
      { id: 'orange-1', label: 'Orange 1', url: createFolderSampleUrl({ bodyTop: '#ffb86c', bodyBottom: '#f76707', tabTop: '#ffd8a8', tabBottom: '#ff922b', highlight: '#fff7f0' }) },
      { id: 'orange-2', label: 'Orange 2', url: createFolderSampleUrl({ bodyTop: '#ffc078', bodyBottom: '#e8590c', tabTop: '#ffe8cc', tabBottom: '#ff922b', highlight: '#fff7f2' }) },
      { id: 'orange-3', label: 'Orange 3', url: createFolderSampleUrl({ bodyTop: '#ffa94d', bodyBottom: '#d9480f', tabTop: '#ffd8a8', tabBottom: '#ff922b', highlight: '#fff6ee' }) },
    ],
  },
  {
    label: 'Red',
    samples: [
      { id: 'red-1', label: 'Red 1', url: createFolderSampleUrl({ bodyTop: '#ff8787', bodyBottom: '#e03131', tabTop: '#ffc9c9', tabBottom: '#ff6b6b', highlight: '#fff5f5' }) },
      { id: 'red-2', label: 'Red 2', url: createFolderSampleUrl({ bodyTop: '#ff9b9b', bodyBottom: '#c92a2a', tabTop: '#ffe3e3', tabBottom: '#ff8787', highlight: '#fff7f7' }) },
      { id: 'red-3', label: 'Red 3', url: createFolderSampleUrl({ bodyTop: '#ffa8a8', bodyBottom: '#fa5252', tabTop: '#ffe3e3', tabBottom: '#ff8787', highlight: '#fff8f8' }) },
    ],
  },
  {
    label: 'Purple',
    samples: [
      { id: 'purple-1', label: 'Purple 1', url: createFolderSampleUrl({ bodyTop: '#d0bfff', bodyBottom: '#7048e8', tabTop: '#e5dbff', tabBottom: '#9775fa', highlight: '#faf5ff' }) },
      { id: 'purple-2', label: 'Purple 2', url: createFolderSampleUrl({ bodyTop: '#d8b4fe', bodyBottom: '#9333ea', tabTop: '#f3d9fa', tabBottom: '#c77dff', highlight: '#fdf7ff' }) },
      { id: 'purple-3', label: 'Purple 3', url: createFolderSampleUrl({ bodyTop: '#e599f7', bodyBottom: '#9c36b5', tabTop: '#f8d9fa', tabBottom: '#cc5de8', highlight: '#fef7ff' }) },
    ],
  },
]

function toTitleCase(value) {
  return value.replace(/\b\w/g, (character) => character.toUpperCase())
}

function stripFolderSuffix(value) {
  return value.replace(/_folder$/i, '')
}

function formatFolderLabel(folderName) {
  return toTitleCase(stripFolderSuffix(folderName).replace(/[-_]+/g, ' '))
}

function formatBackgroundSampleLabel(filePath) {
  const fileName = filePath.split('/').pop()?.replace(/\.[^.]+$/, '') ?? 'Background'
  return toTitleCase(fileName.replace(/[-_]+/g, ' '))
}

function parseAssetFolderAndFile(filePath) {
  const match = filePath.match(/^\.\.\/assets\/([^/]+)\/([^/]+)$/)

  if (match) {
    return {
      folderName: match[1],
      fileNameWithExtension: match[2],
    }
  }

  const fallbackFile = filePath.split('/').pop() ?? 'background.png'
  return {
    folderName: 'quick-start-folder',
    fileNameWithExtension: fallbackFile,
  }
}

function getQuickStartBackgroundFolders() {
  const folderEntriesByName = new Map()
  const sortedEntries = Object.entries(quickStartBackgroundModules).sort(([left], [right]) => left.localeCompare(right))

  for (const [filePath, url] of sortedEntries) {
    const { folderName, fileNameWithExtension } = parseAssetFolderAndFile(filePath)
    const fileName = fileNameWithExtension.replace(/\.[^.]+$/, '')
    const safeFileName = toSafeFilenamePart(fileName) || 'background'
    const folderId = `folder-${toSafeFilenamePart(folderName) || 'assets'}`
    const folderDisplayName = stripFolderSuffix(folderName)
    const sampleId = `asset-${folderId}-${safeFileName}`
    const sample = {
      id: sampleId,
      name: safeFileName,
      label: formatBackgroundSampleLabel(filePath),
      url,
      folderId,
      folderName: folderDisplayName,
    }

    if (!folderEntriesByName.has(folderName)) {
      folderEntriesByName.set(folderName, {
        id: folderId,
        name: folderDisplayName,
        label: formatFolderLabel(folderName),
        samples: [sample],
      })
      continue
    }

    folderEntriesByName.get(folderName).samples.push(sample)
  }

  const folders = [...folderEntriesByName.entries()]
    .sort(([left], [right]) => left.localeCompare(right))
    .map(([, folder]) => ({
      ...folder,
      previewUrl: folder.samples[0]?.url ?? '',
    }))

  if (folders.length > 0) {
    return folders
  }

  return fallbackBackgroundSampleGroups.map((group, groupIndex) => {
    const folderName = toSafeFilenamePart(group.label) || `group-${groupIndex + 1}`
    const folderId = `folder-${folderName}`
    const samples = group.samples.map((sample, sampleIndex) => ({
      ...sample,
      id: `${folderId}-sample-${sampleIndex + 1}`,
      folderId,
      folderName: folderName,
      name: toSafeFilenamePart(sample.name || sample.id || `background-${sampleIndex + 1}`) || `background-${sampleIndex + 1}`,
    }))

    return {
      id: folderId,
      name: folderName,
      label: group.label,
      previewUrl: samples[0]?.url ?? '',
      samples,
    }
  })
}

const backgroundFolders = getQuickStartBackgroundFolders()
const backgroundFoldersById = new Map(backgroundFolders.map((folder) => [folder.id, folder]))
const backgroundSamplesById = new Map()
const initialBackgroundFolder = backgroundFolders.find((folder) => folder.samples.length > 0) ?? null
const initialBackgroundSample = initialBackgroundFolder?.samples[0] ?? null

for (const folder of backgroundFolders) {
  for (const sample of folder.samples) {
    backgroundSamplesById.set(sample.id, sample)
  }
}

const state = {
  backgroundObjectUrl: '',
  backgroundMode: initialBackgroundSample ? 'image' : 'none',
  backgroundFolderId: initialBackgroundFolder?.id ?? '',
  backgroundFolderName: initialBackgroundFolder?.name ? toSafeFilenamePart(initialBackgroundFolder.name) : '',
  backgroundSampleId: '',
  backgroundUrl: '',
  backgroundName: '',
  vectorPresetId: DEFAULT_VECTOR_BACKGROUND_SETTINGS.presetId,
  vectorPresetLabel: DEFAULT_VECTOR_BACKGROUND_SETTINGS.presetLabel,
  vectorShape: DEFAULT_VECTOR_BACKGROUND_SETTINGS.shape,
  vectorFillStart: DEFAULT_VECTOR_BACKGROUND_SETTINGS.fillStart,
  vectorFillEnd: DEFAULT_VECTOR_BACKGROUND_SETTINGS.fillEnd,
  vectorUseSecondColor: DEFAULT_VECTOR_BACKGROUND_SETTINGS.useSecondColor,
  vectorAngle: DEFAULT_VECTOR_BACKGROUND_SETTINGS.angle,
  vectorBorderSize: DEFAULT_VECTOR_BACKGROUND_SETTINGS.borderSize,
  vectorBorderColor: DEFAULT_VECTOR_BACKGROUND_SETTINGS.borderColor,
  style: 'solid',
  offsetX: 0,
  offsetY: 20,
  size: 40,
  colors: [...defaultColors],
  palette: [],
  dominantColor: null,
  recommendedGlyphColor: null,
  exportFormat: 'png',
  exportSize: defaultExportSize,
  isExporting: false,
  exportProcessedCount: 0,
  exportTotalCount: 0,
  previewIcons: [],
  sortOrder: 'asc',
  searchQuery: '',
}

function normalizeSearchTerm(value) {
  return value
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim()
}

const searchableIconsByStyle = Object.fromEntries(
  Object.entries(iconsIndex).map(([style, entries]) => [
    style,
    entries.map((entry) => ({
      ...entry,
      normalizedName: normalizeSearchTerm(entry.name),
      normalizedCssClass: normalizeSearchTerm(entry.cssClass),
      normalizedAliases: entry.aliases.map(normalizeSearchTerm),
      normalizedCategories: entry.categories.map(normalizeSearchTerm),
      normalizedSearchTerms: entry.searchTerms.map(normalizeSearchTerm),
    })),
  ]),
)

const fuseByStyle = new Map()

const app = document.querySelector('#app')

app.innerHTML = `
  <main class="layout">
    <section class="panel controls-panel">
      <div class="panel-heading">
        <p class="eyebrow">Icons Pack Generator</p>
        <h1>Icon pack preview</h1>
      </div>

      <form class="controls" aria-label="Icon pack controls">
        <fieldset class="background-group">
          <legend>Background image</legend>
          <label class="field">
            <span>Background mode</span>
            <select id="background-mode">
              <option value="image">Image</option>
              <option value="vector">Vector</option>
              <option value="none">None</option>
            </select>
          </label>

          <div id="background-image-panel" class="background-mode-panel">
            <div id="background-folders" class="background-folders" aria-live="polite"></div>
            <div id="background-samples" class="background-samples" aria-live="polite"></div>
            <div class="background-actions">
              <button id="clear-background" type="button" class="secondary-button">No background</button>
            </div>
            <label class="field file-field">
              <span>Custom image (optional)</span>
              <input id="background-input" type="file" accept="image/*" />
            </label>
          </div>

          <div id="background-vector-panel" class="background-mode-panel" hidden>
            <div class="vector-preset-toolbar">
              ${renderVectorPresetGroups()}
            </div>

            <div class="vector-fields">
              <label class="field">
                <span>Shape</span>
                <select id="vector-shape">${renderVectorShapeOptions()}</select>
              </label>

              <label class="field">
                <span>Color 1</span>
                <input id="vector-fill-start" type="color" value="${DEFAULT_VECTOR_BACKGROUND_SETTINGS.fillStart}" />
              </label>

              <label class="field vector-secondary-field">
                <span>Color 2</span>
                <input id="vector-fill-end" type="color" value="${DEFAULT_VECTOR_BACKGROUND_SETTINGS.fillEnd}" />
              </label>

              <label class="field vector-checkbox-field">
                <span>Use second color</span>
                <input id="vector-use-second-color" type="checkbox" ${DEFAULT_VECTOR_BACKGROUND_SETTINGS.useSecondColor ? 'checked' : ''} />
              </label>

              <label class="field">
                <span>Gradient angle</span>
                <input id="vector-angle-range" type="range" min="0" max="360" step="1" value="${DEFAULT_VECTOR_BACKGROUND_SETTINGS.angle}" />
                <input id="vector-angle" type="number" min="0" max="360" step="1" value="${DEFAULT_VECTOR_BACKGROUND_SETTINGS.angle}" />
              </label>

              <label class="field">
                <span>Border size %</span>
                <input id="vector-border-size-range" type="range" min="0" max="20" step="1" value="${DEFAULT_VECTOR_BACKGROUND_SETTINGS.borderSize}" />
                <input id="vector-border-size" type="number" min="0" max="20" step="1" value="${DEFAULT_VECTOR_BACKGROUND_SETTINGS.borderSize}" />
              </label>

              <label class="field">
                <span>Border color</span>
                <input id="vector-border-color" type="color" value="${DEFAULT_VECTOR_BACKGROUND_SETTINGS.borderColor}" />
              </label>
            </div>
          </div>
        </fieldset>

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
          <div id="palette-swatches" class="palette-swatches" aria-live="polite"></div>
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
                <option value="128">128 (default)</option>
                <option value="256">256</option>
                <option value="512">512</option>
              </select>
            </label>
          </div>
          <button id="export-button" type="button" class="primary-button export-button">Download icon pack ZIP</button>
          <button id="install-button" type="button" class="secondary-button install-button" hidden>Install web app</button>
          <p id="install-hint" class="hint install-hint" hidden></p>
        </fieldset>
      </form>
    </section>

    <section class="panel preview-panel">
      <div class="preview-header">
        <p class="eyebrow">Preview</p>
        <div class="preview-actions">
          <label class="field preview-search-field">
            <span>Search icons</span>
            <input id="search-input" type="search" placeholder="Name, alias, category, keyword..." autocomplete="off" />
          </label>
          <button id="sort-button" type="button" class="primary-button">A → Z</button>
        </div>
      </div>
      <div id="preview-grid" class="preview-grid" aria-live="polite"></div>
    </section>
  </main>
`

const backgroundInput = document.querySelector('#background-input')
const backgroundModeSelect = document.querySelector('#background-mode')
const backgroundImagePanel = document.querySelector('#background-image-panel')
const backgroundVectorPanel = document.querySelector('#background-vector-panel')
const backgroundFoldersElement = document.querySelector('#background-folders')
const backgroundSamples = document.querySelector('#background-samples')
const clearBackgroundButton = document.querySelector('#clear-background')
const vectorShapeSelect = document.querySelector('#vector-shape')
const vectorFillStartInput = document.querySelector('#vector-fill-start')
const vectorFillEndInput = document.querySelector('#vector-fill-end')
const vectorUseSecondColorInput = document.querySelector('#vector-use-second-color')
const vectorAngleRange = document.querySelector('#vector-angle-range')
const vectorAngleInput = document.querySelector('#vector-angle')
const vectorBorderSizeRange = document.querySelector('#vector-border-size-range')
const vectorBorderSizeInput = document.querySelector('#vector-border-size')
const vectorBorderColorInput = document.querySelector('#vector-border-color')
const styleSelect = document.querySelector('#style-select')
const previewGrid = document.querySelector('#preview-grid')
const colorFields = document.querySelector('#color-fields')
const paletteSwatches = document.querySelector('#palette-swatches')
const addColorButton = document.querySelector('#add-color')
const resetColorsButton = document.querySelector('#reset-colors')
const sortButton = document.querySelector('#sort-button')
const searchInput = document.querySelector('#search-input')
const exportFormatSelect = document.querySelector('#export-format')
const exportSizeSelect = document.querySelector('#export-size')
const exportButton = document.querySelector('#export-button')
const installButton = document.querySelector('#install-button')
const installHint = document.querySelector('#install-hint')
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

function stripFaPrefix(iconClass) {
  return iconClass.startsWith('fa-') ? iconClass.slice(3) : iconClass
}

function getExportIconNames() {
  return iconSets[state.style]
    .filter((iconClass) => iconClass.startsWith('fa-'))
    .map(stripFaPrefix)
    .sort((left, right) => left.localeCompare(right))
}

function getFuseForStyle(style) {
  if (fuseByStyle.has(style)) {
    return fuseByStyle.get(style)
  }

  const fuse = new Fuse(searchableIconsByStyle[style] ?? [], {
    ignoreLocation: true,
    threshold: 0.35,
    minMatchCharLength: 2,
    keys: [
      { name: 'normalizedName', weight: 0.35 },
      { name: 'normalizedCssClass', weight: 0.25 },
      { name: 'normalizedAliases', weight: 0.15 },
      { name: 'normalizedSearchTerms', weight: 0.15 },
      { name: 'normalizedCategories', weight: 0.1 },
    ],
  })

  fuseByStyle.set(style, fuse)
  return fuse
}

function getSortedStyleIcons(style) {
  const icons = (iconSets[style] ?? []).filter((iconClass) => iconClass.startsWith('fa-'))
  if (state.sortOrder === 'asc') {
    icons.sort((left, right) => left.localeCompare(right))
  } else {
    icons.sort((left, right) => right.localeCompare(left))
  }
  return icons
}

function getFilteredStyleIcons(style) {
  const sortedIcons = getSortedStyleIcons(style)
  const query = normalizeSearchTerm(state.searchQuery)

  if (!query) {
    return sortedIcons
  }

  const fuse = getFuseForStyle(style)
  const matchedClasses = fuse.search(query).map((result) => result.item.cssClass)
  const availableClassNames = new Set(sortedIcons)
  const seenClassNames = new Set()
  const filteredIcons = []

  for (const className of matchedClasses) {
    if (!availableClassNames.has(className) || seenClassNames.has(className)) {
      continue
    }
    seenClassNames.add(className)
    filteredIcons.push(className)
  }

  return filteredIcons
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

async function sampleBackgroundImageData(imageUrl) {
  const image = await loadImage(imageUrl)
  const sampleSize = 64
  const canvas = document.createElement('canvas')
  canvas.width = sampleSize
  canvas.height = sampleSize
  const context = canvas.getContext('2d')
  drawBackgroundImageCover(context, image, sampleSize)
  return context.getImageData(0, 0, sampleSize, sampleSize)
}

async function analyzeBackgroundImage(imageUrl) {
  const imageData = await sampleBackgroundImageData(imageUrl)
  const { palette, dominantColor, highestContrastColor } = extractColorPalette(imageData, DEFAULT_PALETTE_SIZE, quantizeRgbaPixels)

  return {
    palette,
    dominantColor,
    recommendedGlyphColor: highestContrastColor,
  }
}

function renderSwatchRow(colors) {
  return colors
    .map(
      (color) => `
    <button
      type="button"
      class="palette-swatch"
      data-palette-color="${color}"
      style="background-color: ${color}"
      title="${color}"
      aria-label="Apply color ${color}"
    ></button>
  `,
    )
    .join('')
}

function renderPaletteSwatches() {
  paletteSwatches.innerHTML = `
    <div class="color-preset-toolbar">
      <span class="preset-toolbar-label">Black &amp; White</span>
      <div class="palette-grid">
        ${renderSwatchRow(['#000000', '#ffffff'])}
      </div>
    </div>
    <div class="color-preset-toolbar">
      <span class="preset-toolbar-label">Vibrant</span>
      <div class="palette-grid">
        ${renderSwatchRow(VIBRANT_COLORS)}
      </div>
    </div>
    <div class="color-preset-toolbar">
      <span class="preset-toolbar-label">Pastel</span>
      <div class="palette-grid">
        ${renderSwatchRow(PASTEL_COLORS)}
      </div>
    </div>
    <div class="color-preset-toolbar">
      <span class="preset-toolbar-label">Morandi</span>
      <div class="palette-grid">
        ${renderSwatchRow(MORANDI_COLORS)}
      </div>
    </div>
    ${state.palette.length > 0 ? `
      <div class="color-preset-toolbar">
        <span class="preset-toolbar-label">Background palette</span>
        <div class="palette-grid">
          ${renderSwatchRow(state.palette)}
        </div>
      </div>
    ` : ''}
  `
}

function getActiveBackgroundFolder() {
  if (state.backgroundFolderId) {
    return backgroundFoldersById.get(state.backgroundFolderId) ?? null
  }

  return initialBackgroundFolder
}

function renderBackgroundFolders() {
  backgroundFoldersElement.innerHTML = backgroundFolders
    .map(
      (folder, index) => `
        <button
          type="button"
          class="background-folder${state.backgroundFolderId === folder.id ? ' is-active' : ''}"
          data-background-folder="${folder.id}"
          aria-pressed="${state.backgroundFolderId === folder.id}"
          aria-label="Select ${folder.label} folder, group ${index + 1} of ${backgroundFolders.length}"
          title="${folder.label}"
        >
          <span class="background-folder-thumb-wrap">
            ${folder.previewUrl ? `<img class="background-folder-thumb" src="${folder.previewUrl}" alt="" />` : ''}
          </span>
          <span class="background-folder-name">${folder.label}</span>
        </button>
      `,
    )
    .join('')
}

function renderBackgroundSamples() {
  const activeFolder = getActiveBackgroundFolder()

  if (!activeFolder) {
    backgroundSamples.innerHTML = ''
    return
  }

  backgroundSamples.innerHTML = `
    <section class="background-sample-group" aria-label="${activeFolder.label} backgrounds">
      <p class="background-sample-group-title">${activeFolder.label}</p>
      <div class="background-sample-grid">
        ${activeFolder.samples
          .map(
            (sample, index) => `
              <button
                type="button"
                class="background-sample${state.backgroundSampleId === sample.id ? ' is-active' : ''}"
                data-background-sample="${sample.id}"
                aria-pressed="${state.backgroundSampleId === sample.id}"
                aria-label="Select ${sample.label} background, sample ${index + 1} of ${activeFolder.samples.length}"
                title="${sample.label}"
              >
                <img class="background-sample-image" src="${sample.url}" alt="" />
              </button>
            `,
          )
          .join('')}
      </div>
    </section>
  `
}

function updateBackgroundSampleSelection() {
  for (const button of backgroundFoldersElement.querySelectorAll('[data-background-folder]')) {
    const isActive = button.dataset.backgroundFolder === state.backgroundFolderId
    button.classList.toggle('is-active', isActive)
    button.setAttribute('aria-pressed', String(isActive))
  }

  for (const button of backgroundSamples.querySelectorAll('[data-background-sample]')) {
    const isActive = button.dataset.backgroundSample === state.backgroundSampleId
    button.classList.toggle('is-active', isActive)
    button.setAttribute('aria-pressed', String(isActive))
  }

  for (const button of document.querySelectorAll('[data-vector-preset]')) {
    const isActive = button.dataset.vectorPreset === state.vectorPresetId
    button.classList.toggle('is-active', isActive)
    button.setAttribute('aria-pressed', String(isActive))
  }

  backgroundModeSelect.value = state.backgroundMode
  backgroundImagePanel.hidden = state.backgroundMode !== 'image'
  backgroundVectorPanel.hidden = state.backgroundMode !== 'vector'
  clearBackgroundButton.classList.toggle('is-active', state.backgroundMode === 'none')
}

function syncVectorInputs() {
  const normalized = normalizeVectorBackgroundSettings({
    shape: state.vectorShape,
    fillStart: state.vectorFillStart,
    fillEnd: state.vectorFillEnd,
    useSecondColor: state.vectorUseSecondColor,
    angle: state.vectorAngle,
    borderSize: state.vectorBorderSize,
    borderColor: state.vectorBorderColor,
    presetId: state.vectorPresetId,
    presetLabel: state.vectorPresetLabel,
  })

  state.vectorShape = normalized.shape
  state.vectorFillStart = normalized.fillStart
  state.vectorFillEnd = normalized.fillEnd
  state.vectorUseSecondColor = normalized.useSecondColor
  state.vectorAngle = normalized.angle
  state.vectorBorderSize = normalized.borderSize
  state.vectorBorderColor = normalized.borderColor

  vectorShapeSelect.value = state.vectorShape
  vectorFillStartInput.value = state.vectorFillStart
  vectorFillEndInput.value = state.vectorFillEnd
  vectorUseSecondColorInput.checked = state.vectorUseSecondColor
  vectorAngleRange.value = String(state.vectorAngle)
  vectorAngleInput.value = String(state.vectorAngle)
  vectorBorderSizeRange.value = String(state.vectorBorderSize)
  vectorBorderSizeInput.value = String(state.vectorBorderSize)
  vectorBorderColorInput.value = state.vectorBorderColor
}

function applyVectorPreset(presetId) {
  const preset = getVectorBackgroundPresetSettings(presetId)
  if (!preset) {
    return
  }

  state.backgroundMode = 'vector'
  state.vectorPresetId = presetId
  state.vectorPresetLabel = preset.presetLabel || preset.label || 'Custom'
  state.vectorShape = preset.shape
  state.vectorFillStart = preset.fillStart
  state.vectorFillEnd = preset.fillEnd
  state.vectorUseSecondColor = preset.useSecondColor
  state.vectorAngle = preset.angle
  state.vectorBorderSize = preset.borderSize
  state.vectorBorderColor = preset.borderColor
  state.backgroundUrl = ''
  state.backgroundName = ''
  state.backgroundSampleId = ''
  revokeBackgroundObjectUrl()
  backgroundInput.value = ''
  syncVectorInputs()
  updateBackgroundSampleSelection()
  renderPaletteSwatches()
  renderPreview()
}

function updateVectorControlsUi() {
  syncVectorInputs()
  for (const button of document.querySelectorAll('[data-vector-preset]')) {
    const isActive = button.dataset.vectorPreset === state.vectorPresetId
    button.classList.toggle('is-active', isActive)
    button.setAttribute('aria-pressed', String(isActive))
  }
}

function markVectorAsCustom() {
  state.vectorPresetId = ''
  state.vectorPresetLabel = 'Custom'
}

function syncVectorSetting(key, value) {
  state.backgroundMode = 'vector'
  markVectorAsCustom()
  state[key] = value
  syncVectorInputs()
  updateBackgroundSampleSelection()
  renderPreview()
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

function triggerBlobDownload(blob, filename, revokeDelayMs = 0) {
  const objectUrl = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = objectUrl
  link.download = filename
  link.style.display = 'none'
  document.body.append(link)
  link.click()
  link.remove()

  if (revokeDelayMs > 0) {
    window.setTimeout(() => URL.revokeObjectURL(objectUrl), revokeDelayMs)
    return
  }

  URL.revokeObjectURL(objectUrl)
}

async function exportCanvasAsGif(canvas) {
  const context = canvas.getContext('2d')
  const { data } = context.getImageData(0, 0, canvas.width, canvas.height)
  const palette = quantizeRgbaPixels(data, 256)
  const index = applyPalette(data, palette)
  const gif = GIFEncoder()
  gif.writeFrame(index, canvas.width, canvas.height, { palette })
  gif.finish()
  return new Blob([gif.bytesView()], { type: 'image/gif' })
}

async function renderIconBlob({ glyph, size, format, backgroundImage, vectorBackgroundSettings }) {
  const { family, weight } = exportFontVariants[state.style]
  const canvas = document.createElement('canvas')
  canvas.width = size
  canvas.height = size
  const context = canvas.getContext('2d')

  if (vectorBackgroundSettings) {
    drawVectorBackground(context, size, vectorBackgroundSettings)
  } else if (backgroundImage) {
    drawBackgroundImageCover(context, backgroundImage, size)
  } else if (format === 'jpg') {
    context.fillStyle = '#ffffff'
    context.fillRect(0, 0, size, size)
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
    const backgroundImage = state.backgroundMode === 'image' && state.backgroundUrl ? await loadImage(state.backgroundUrl) : null
    const vectorBackgroundSettings = state.backgroundMode === 'vector'
      ? normalizeVectorBackgroundSettings({
          shape: state.vectorShape,
          fillStart: state.vectorFillStart,
          fillEnd: state.vectorFillEnd,
          useSecondColor: state.vectorUseSecondColor,
          angle: state.vectorAngle,
          borderSize: state.vectorBorderSize,
          borderColor: state.vectorBorderColor,
          presetId: state.vectorPresetId,
          presetLabel: state.vectorPresetLabel,
        })
      : null
    const backgroundFilenamePart = buildBackgroundAssetFilenamePart({
      backgroundMode: state.backgroundMode,
      backgroundFolder: state.backgroundFolderName,
      backgroundName: state.backgroundName,
      vectorPresetLabel: state.vectorPresetLabel,
      vectorShape: state.vectorShape,
      vectorVariant: state.vectorBorderSize > 0 ? 'border' : (state.vectorUseSecondColor ? 'gradient' : 'solid'),
    })
    const zipBaseName = state.backgroundMode === 'none' ? 'icon-pack' : backgroundFilenamePart
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
        vectorBackgroundSettings,
      })
      zip.file(`${iconName}.${state.exportFormat}`, iconBlob)

      state.exportProcessedCount += 1
      if (state.exportTotalCount <= 10 || state.exportProcessedCount % 10 === 0) {
        updateExportButton()
      }
    }

    const archiveBlob = await zip.generateAsync({ type: 'blob' })
    triggerBlobDownload(archiveBlob, `${zipBaseName}-${state.exportFormat}-${state.exportSize}.zip`)
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

async function downloadPreviewIcon(iconClassName) {
  const glyphMap = getCachedGlyphMap()
  const glyph = glyphMap.get(iconClassName) ?? ''

  if (!glyph) {
    return
  }

  try {
    const backgroundImage = state.backgroundMode === 'image' && state.backgroundUrl ? await loadImage(state.backgroundUrl) : null
    const vectorBackgroundSettings = state.backgroundMode === 'vector'
      ? normalizeVectorBackgroundSettings({
          shape: state.vectorShape,
          fillStart: state.vectorFillStart,
          fillEnd: state.vectorFillEnd,
          useSecondColor: state.vectorUseSecondColor,
          angle: state.vectorAngle,
          borderSize: state.vectorBorderSize,
          borderColor: state.vectorBorderColor,
          presetId: state.vectorPresetId,
          presetLabel: state.vectorPresetLabel,
        })
      : null
    const blob = await renderIconBlob({
      glyph,
      size: state.exportSize,
      format: state.exportFormat,
      backgroundImage,
      vectorBackgroundSettings,
    })
    const iconName = stripFaPrefix(iconClassName)
    triggerBlobDownload(
      blob,
      buildSingleIconDownloadFilename({
        backgroundMode: state.backgroundMode,
        backgroundFolder: state.backgroundFolderName,
        backgroundName: state.backgroundName,
        vectorPresetLabel: state.vectorPresetLabel,
        vectorShape: state.vectorShape,
        vectorVariant: state.vectorBorderSize > 0 ? 'border' : (state.vectorUseSecondColor ? 'gradient' : 'solid'),
        iconName,
        colors: state.colors,
        format: state.exportFormat,
      }),
      objectUrlRevokeDelayMs,
    )
  } catch (error) {
    console.error(`Failed to export icon "${iconClassName}":`, error)
  }
}

function updateSortButton() {
  const hasSearchQuery = normalizeSearchTerm(state.searchQuery).length > 0
  sortButton.disabled = hasSearchQuery
  if (hasSearchQuery) {
    sortButton.textContent = 'Relevance'
    return
  }
  sortButton.textContent = state.sortOrder === 'asc' ? 'A → Z' : 'Z → A'
}

function sortPreviewIcons() {
  state.previewIcons = getFilteredStyleIcons(state.style)
}

const previewTileSize = 64
const previewGridColumns = 6
let cachedGlyphMap = null
let previewRenderVersion = 0
let previewStructureKey = ''
let deferredInstallPromptEvent = null

function getPreviewStructureKey() {
  return `${state.style}:${state.sortOrder}:${normalizeSearchTerm(state.searchQuery)}`
}

function isStandaloneMode() {
  const isDisplayModeStandalone = window.matchMedia('(display-mode: standalone)').matches
  const isIosStandalone = window.navigator.standalone === true
  return isDisplayModeStandalone || isIosStandalone
}

function isIosSafari() {
  const userAgent = window.navigator.userAgent.toLowerCase()
  const isIos = /iphone|ipad|ipod/.test(userAgent)
  const isWebkit = /webkit/.test(userAgent)
  const isCriOS = /crios/.test(userAgent)
  const isFxiOS = /fxios/.test(userAgent)
  return isIos && isWebkit && !isCriOS && !isFxiOS
}

function updateInstallUi() {
  const installed = isStandaloneMode()

  if (installed) {
    installButton.hidden = true
    installHint.hidden = false
    installHint.textContent = 'Web app already installed on this device.'
    return
  }

  if (deferredInstallPromptEvent) {
    installButton.hidden = false
    installButton.disabled = false
    installButton.textContent = 'Install web app'
    installHint.hidden = true
    installHint.textContent = ''
    return
  }

  if (isIosSafari()) {
    installButton.hidden = true
    installHint.hidden = false
    installHint.textContent = 'On iPhone/iPad: Share -> Add to Home Screen.'
    return
  }

  installButton.hidden = false
  installButton.disabled = true
  installButton.textContent = 'Install unavailable'
  installHint.hidden = false
  installHint.textContent = 'Install becomes available when supported by your browser.'
}

function getPreviewGradient() {
  if (state.colors.length === 1) {
    return ''
  }
  const stopStep = 100 / Math.max(state.colors.length - 1, 1)
  const stops = state.colors.map((color, index) => `${color} ${Math.round(index * stopStep)}%`)
  return `linear-gradient(135deg, ${stops.join(', ')})`
}

function getCachedGlyphMap() {
  if (!cachedGlyphMap) {
    cachedGlyphMap = getGlyphMap()
  }

  return cachedGlyphMap
}

function getPreviewTileSize() {
  const styles = getComputedStyle(previewGrid)
  const gap = Number.parseFloat(styles.columnGap || styles.gap) || 0
  const availableWidth = previewGrid.clientWidth - gap * (previewGridColumns - 1)
  if (availableWidth <= 0) {
    return previewTileSize
  }
  return availableWidth / previewGridColumns
}

function updatePreviewStyles() {
  const { family, weight } = exportFontVariants[state.style]
  const hasImageBackground = state.backgroundMode === 'image' && Boolean(state.backgroundUrl)
  const hasVectorBackground = state.backgroundMode === 'vector'
  const hasGradient = state.colors.length > 1
  const x = 50 + state.offsetX * 0.5
  const y = 50 + state.offsetY * 0.5
  const iconSizePixels = Math.max((getPreviewTileSize() * state.size) / 100, 0)
  const previewTileBackdrop = getPreviewTileBackdrop(state.dominantColor)
  const vectorBackgroundVariables = hasVectorBackground
    ? getVectorBackgroundCssVariables(
        {
          shape: state.vectorShape,
          fillStart: state.vectorFillStart,
          fillEnd: state.vectorFillEnd,
          useSecondColor: state.vectorUseSecondColor,
          angle: state.vectorAngle,
          borderSize: state.vectorBorderSize,
          borderColor: state.vectorBorderColor,
        },
        previewTileSize,
      )
    : getVectorBackgroundCssVariables(DEFAULT_VECTOR_BACKGROUND_SETTINGS, previewTileSize)

  previewGrid.style.setProperty('--preview-icon-font-family', family)
  previewGrid.style.setProperty('--preview-icon-font-weight', weight)
  previewGrid.style.setProperty('--preview-icon-size', `${iconSizePixels}px`)
  previewGrid.style.setProperty('--preview-icon-offset-x', `${x}%`)
  previewGrid.style.setProperty('--preview-icon-offset-y', `${y}%`)
  previewGrid.style.setProperty('--preview-icon-color', state.colors[0] ?? '#ffffff')
  previewGrid.style.setProperty('--preview-icon-gradient', getPreviewGradient())
  previewGrid.style.setProperty('--preview-background-image', hasImageBackground ? `url("${state.backgroundUrl}")` : 'none')
  previewGrid.style.setProperty('--preview-tile-back-color', previewTileBackdrop.backgroundColor)
  previewGrid.style.setProperty('--preview-transparent-base', previewTileBackdrop.motifBase)
  previewGrid.style.setProperty('--preview-transparent-accent', previewTileBackdrop.motifAccent)
  for (const [name, value] of Object.entries(vectorBackgroundVariables)) {
    previewGrid.style.setProperty(name, value)
  }
  previewGrid.classList.toggle('preview-grid--with-background', hasImageBackground)
  previewGrid.classList.toggle('preview-grid--vector', hasVectorBackground)
  previewGrid.classList.toggle('preview-grid--transparent', state.backgroundMode === 'none')
  previewGrid.classList.toggle('preview-grid--gradient', hasGradient)
}

async function renderPreview() {
  const version = ++previewRenderVersion
  const { family, weight } = exportFontVariants[state.style]

  await document.fonts.load(`${weight} ${previewTileSize}px ${family}`)
  if (version !== previewRenderVersion) return

  const glyphMap = getCachedGlyphMap()
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

      const tile = document.createElement('button')
      tile.className = 'preview-tile'
      tile.type = 'button'
      tile.tabIndex = 0
      tile.dataset.previewIcon = iconClassName
      tile.setAttribute('aria-label', `Download ${iconName}`)
      tile.addEventListener('click', () => {
        downloadPreviewIcon(iconClassName)
      })

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

function revokeBackgroundObjectUrl(url = state.backgroundObjectUrl) {
  if (!url) {
    return
  }

  URL.revokeObjectURL(url)
  if (state.backgroundObjectUrl === url) {
    state.backgroundObjectUrl = ''
  }
}

async function applyBackground({
  url,
  name = '',
  sampleId = '',
  folderId = '',
  folderName = '',
  isBlobUrl = false,
  backgroundMode = url ? 'image' : 'none',
}) {
  const previousBackgroundObjectUrl = state.backgroundObjectUrl
  revokeBackgroundObjectUrl(previousBackgroundObjectUrl)

  state.backgroundMode = backgroundMode
  state.backgroundUrl = url
  state.backgroundName = name ? toSafeFilenamePart(name) : ''
  state.backgroundFolderId = folderId
  state.backgroundFolderName = folderName ? toSafeFilenamePart(folderName) : ''
  state.backgroundSampleId = sampleId
  state.backgroundObjectUrl = isBlobUrl ? url : ''
  state.palette = []
  state.dominantColor = null
  state.recommendedGlyphColor = null

  if (!isBlobUrl) {
    backgroundInput.value = ''
  }

  updateBackgroundSampleSelection()
  renderPaletteSwatches()
  renderPreview()

  if (!url) {
    return
  }

  try {
    const { palette, dominantColor, recommendedGlyphColor } = await analyzeBackgroundImage(url)
    if (state.backgroundUrl === url) {
      state.palette = palette
      state.dominantColor = dominantColor
      state.recommendedGlyphColor = recommendedGlyphColor
      state.colors = [recommendedGlyphColor]
      renderColorFields()
      renderPaletteSwatches()
      renderPreview()
    }
  } catch (error) {
    console.error(`Failed to extract color palette from background image "${name || sampleId || url}":`, error)
  }
}

backgroundInput.addEventListener('change', async (event) => {
  const [file] = event.target.files ?? []

  if (!file) {
    await applyBackground({ url: '', backgroundMode: 'none' })
    return
  }

  const url = URL.createObjectURL(file)
  await applyBackground({
    url,
    name: file.name.replace(/\.[^.]*$/, ''),
    isBlobUrl: true,
    backgroundMode: 'image',
  })
})

backgroundFoldersElement.addEventListener('click', async (event) => {
  const button = event.target.closest('[data-background-folder]')
  if (!button) {
    return
  }

  const folder = backgroundFoldersById.get(button.dataset.backgroundFolder)
  if (!folder || folder.samples.length === 0) {
    return
  }

  state.backgroundFolderId = folder.id
  renderBackgroundFolders()
  renderBackgroundSamples()
  updateBackgroundSampleSelection()

  const firstSample = folder.samples[0]
  await applyBackground({
    url: firstSample.url,
    name: firstSample.name,
    sampleId: firstSample.id,
    folderId: folder.id,
    folderName: folder.name,
    backgroundMode: 'image',
  })
})

backgroundSamples.addEventListener('click', async (event) => {
  const button = event.target.closest('[data-background-sample]')
  if (!button) {
    return
  }

  const sample = backgroundSamplesById.get(button.dataset.backgroundSample)
  if (!sample) {
    return
  }

  await applyBackground({
    url: sample.url,
    name: sample.name,
    sampleId: sample.id,
    folderId: sample.folderId,
    folderName: sample.folderName,
    backgroundMode: 'image',
  })
})

clearBackgroundButton.addEventListener('click', async () => {
  await applyBackground({
    url: '',
    folderId: state.backgroundFolderId,
    folderName: state.backgroundFolderName,
    backgroundMode: 'none',
  })
})

backgroundModeSelect.addEventListener('change', (event) => {
  const mode = event.target.value

  if (mode === 'vector') {
    state.backgroundMode = 'vector'
    state.backgroundUrl = ''
    state.backgroundName = ''
    state.backgroundSampleId = ''
    revokeBackgroundObjectUrl()
    backgroundInput.value = ''
    syncVectorInputs()
    updateBackgroundSampleSelection()
    renderPaletteSwatches()
    renderPreview()
    return
  }

  if (mode === 'none') {
    state.backgroundMode = 'none'
    state.backgroundUrl = ''
    state.backgroundName = ''
    state.backgroundSampleId = ''
    revokeBackgroundObjectUrl()
    backgroundInput.value = ''
    updateBackgroundSampleSelection()
    renderPaletteSwatches()
    renderPreview()
    return
  }

  state.backgroundMode = 'image'
  updateBackgroundSampleSelection()
  renderPreview()
})

for (const presetButton of document.querySelectorAll('[data-vector-preset]')) {
  presetButton.addEventListener('click', () => {
    applyVectorPreset(presetButton.dataset.vectorPreset)
  })
}

vectorShapeSelect.addEventListener('change', (event) => {
  syncVectorSetting('vectorShape', event.target.value)
})

vectorFillStartInput.addEventListener('input', (event) => {
  syncVectorSetting('vectorFillStart', event.target.value.toLowerCase())
})

vectorFillEndInput.addEventListener('input', (event) => {
  syncVectorSetting('vectorFillEnd', event.target.value.toLowerCase())
})

vectorUseSecondColorInput.addEventListener('change', (event) => {
  syncVectorSetting('vectorUseSecondColor', event.target.checked)
})

vectorAngleRange.addEventListener('input', (event) => {
  syncVectorSetting('vectorAngle', clampAngle(event.target.value))
})

vectorAngleInput.addEventListener('input', (event) => {
  syncVectorSetting('vectorAngle', clampAngle(event.target.value))
})

vectorBorderSizeRange.addEventListener('input', (event) => {
  syncVectorSetting('vectorBorderSize', clampBorderSize(event.target.value))
})

vectorBorderSizeInput.addEventListener('input', (event) => {
  syncVectorSetting('vectorBorderSize', clampBorderSize(event.target.value))
})

vectorBorderColorInput.addEventListener('input', (event) => {
  syncVectorSetting('vectorBorderColor', event.target.value.toLowerCase())
})

styleSelect.addEventListener('change', (event) => {
  state.style = event.target.value
  sortPreviewIcons()
  updateSortButton()
  renderPreview()
})

searchInput.addEventListener('input', (event) => {
  state.searchQuery = event.target.value
  sortPreviewIcons()
  updateSortButton()
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

paletteSwatches.addEventListener('click', (event) => {
  const button = event.target.closest('[data-palette-color]')
  if (!button) {
    return
  }
  const color = button.dataset.paletteColor
  state.colors = [color]
  renderColorFields()
  renderPreview()
})

sortButton.addEventListener('click', () => {
  if (sortButton.disabled) {
    return
  }
  state.sortOrder = state.sortOrder === 'asc' ? 'desc' : 'asc'
  sortPreviewIcons()
  updateSortButton()
  renderPreview()
})

window.addEventListener('resize', () => {
  updatePreviewStyles()
})

exportFormatSelect.addEventListener('change', (event) => {
  state.exportFormat = event.target.value
})

exportSizeSelect.addEventListener('change', (event) => {
  const value = Number.parseInt(event.target.value, 10)
  state.exportSize = [128, 256, 512].includes(value) ? value : defaultExportSize
})

exportButton.addEventListener('click', () => {
  exportIconPack()
})

window.addEventListener('beforeinstallprompt', (event) => {
  event.preventDefault()
  deferredInstallPromptEvent = event
  updateInstallUi()
})

window.addEventListener('appinstalled', () => {
  deferredInstallPromptEvent = null
  updateInstallUi()
})

installButton.addEventListener('click', async () => {
  if (!deferredInstallPromptEvent) {
    updateInstallUi()
    return
  }

  installButton.disabled = true

  try {
    deferredInstallPromptEvent.prompt()
    await deferredInstallPromptEvent.userChoice
  } finally {
    deferredInstallPromptEvent = null
    updateInstallUi()
  }
})

sortPreviewIcons()
updateSortButton()
renderColorFields()
renderBackgroundFolders()
renderBackgroundSamples()
updateBackgroundSampleSelection()
updateVectorControlsUi()
updateExportButton()
updateInstallUi()

if (state.backgroundMode === 'image' && initialBackgroundSample) {
  applyBackground({
    url: initialBackgroundSample.url,
    name: initialBackgroundSample.name,
    sampleId: initialBackgroundSample.id,
    folderId: initialBackgroundFolder?.id ?? '',
    folderName: initialBackgroundFolder?.name ?? '',
  })
} else if (state.backgroundMode === 'vector') {
  updateBackgroundSampleSelection()
  renderPaletteSwatches()
  renderPreview()
} else {
  updateBackgroundSampleSelection()
  renderPaletteSwatches()
  renderPreview()
}
