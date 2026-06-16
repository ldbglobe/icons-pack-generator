export function toSafeFilenamePart(value) {
  return String(value ?? '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
}

function formatColorList(colors) {
  const parts = (colors ?? [])
    .map((color) => toSafeFilenamePart(color))
    .filter(Boolean)

  return parts.length > 0 ? parts.join('-') : 'colors'
}

export function buildSingleIconDownloadFilename({
  backgroundName = '',
  iconName = '',
  colors = [],
  format = 'png',
}) {
  const backgroundPart = toSafeFilenamePart(backgroundName) || 'background'
  const iconPart = toSafeFilenamePart(iconName) || 'icon'
  const colorPart = formatColorList(colors)

  return `${backgroundPart}__${iconPart}__${colorPart}.${format}`
}
