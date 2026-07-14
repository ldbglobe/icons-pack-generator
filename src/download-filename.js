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

function formatColorList(colors) {
  const parts = (colors ?? [])
    .map((color) => toSafeFilenamePart(color))
    .filter(Boolean)

  return parts.length > 0 ? parts.join('-') : 'colors'
}

export function buildSingleIconDownloadFilename({
  backgroundFolder = '',
  backgroundName = '',
  iconName = '',
  colors = [],
  format = 'png',
}) {
  const backgroundPart = normalizeBackgroundAssetName({
    backgroundFolder,
    backgroundName,
  })
  const iconPart = toSafeFilenamePart(iconName) || 'icon'
  const colorPart = formatColorList(colors)

  return `${backgroundPart}__${iconPart}__${colorPart}.${format}`
}

export function buildBackgroundAssetFilenamePart({
  backgroundFolder = '',
  backgroundName = '',
} = {}) {
  return normalizeBackgroundAssetName({ backgroundFolder, backgroundName })
}
