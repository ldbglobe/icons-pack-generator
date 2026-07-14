export function toSafeFilenamePart(value) {
  return String(value ?? '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
}

function normalizeBackgroundAssetName({ backgroundFolder = '', backgroundName = '' }) {
  const folderPart = toSafeFilenamePart(backgroundFolder)
  const filePart = toSafeFilenamePart(backgroundName)

  if (folderPart && filePart) {
    return `${folderPart}-${filePart}`
  }

  return folderPart || filePart || 'background'
}

function normalizeVectorBackgroundName({ vectorPresetLabel = '', vectorShape = '', vectorVariant = '' }) {
  const parts = [vectorShape, vectorPresetLabel, vectorVariant]
    .map(toSafeFilenamePart)
    .filter(Boolean)

  return parts.length > 0 ? `vector-${parts.join('-')}` : 'vector-background'
}

function formatColorList(colors) {
  const parts = (colors ?? [])
    .map((color) => toSafeFilenamePart(color))
    .filter(Boolean)

  return parts.length > 0 ? parts.join('-') : 'colors'
}

export function buildSingleIconDownloadFilename({
  backgroundMode = 'image',
  backgroundFolder = '',
  backgroundName = '',
  vectorPresetLabel = '',
  vectorShape = '',
  vectorVariant = '',
  iconName = '',
  colors = [],
  format = 'png',
}) {
  const backgroundPart =
    backgroundMode === 'vector'
      ? normalizeVectorBackgroundName({
          vectorPresetLabel,
          vectorShape,
          vectorVariant,
        })
      : normalizeBackgroundAssetName({
          backgroundFolder,
          backgroundName,
        })
  const iconPart = toSafeFilenamePart(iconName) || 'icon'
  const colorPart = formatColorList(colors)

  return `${backgroundPart}__${iconPart}__${colorPart}.${format}`
}

export function buildBackgroundAssetFilenamePart({
  backgroundMode = 'image',
  backgroundFolder = '',
  backgroundName = '',
  vectorPresetLabel = '',
  vectorShape = '',
  vectorVariant = '',
} = {}) {
  if (backgroundMode === 'vector') {
    return normalizeVectorBackgroundName({
      vectorPresetLabel,
      vectorShape,
      vectorVariant,
    })
  }

  return normalizeBackgroundAssetName({ backgroundFolder, backgroundName })
}
