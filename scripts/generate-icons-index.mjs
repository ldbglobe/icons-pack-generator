import { readFile, writeFile } from 'node:fs/promises'
import { fileURLToPath } from 'node:url'
import { resolve } from 'node:path'

const rootDirectory = resolve(fileURLToPath(new URL('.', import.meta.url)), '..')

function parseQuotedValue(value) {
  return value.trim().replace(/^['"]|['"]$/g, '')
}

function parseCategoriesYaml(yamlContent) {
  const categoriesByIcon = new Map()
  let currentCategoryLabel = ''

  for (const line of yamlContent.split('\n')) {
    const labelMatch = line.match(/^  label:\s*(.+)$/)
    if (labelMatch) {
      currentCategoryLabel = parseQuotedValue(labelMatch[1])
      continue
    }

    const iconMatch = line.match(/^    -\s*(.+)$/)
    if (iconMatch && currentCategoryLabel) {
      const iconName = parseQuotedValue(iconMatch[1])
      const categories = categoriesByIcon.get(iconName) ?? []
      if (!categories.includes(currentCategoryLabel)) {
        categories.push(currentCategoryLabel)
      }
      categoriesByIcon.set(iconName, categories)
    }
  }

  return categoriesByIcon
}

function toGlyph(unicode) {
  const codePoint = Number.parseInt(unicode, 16)
  if (Number.isNaN(codePoint)) {
    return ''
  }
  return String.fromCodePoint(codePoint)
}

function uniqueValues(values) {
  return [...new Set(values)]
}

async function generateIconsIndex() {
  const iconSetsPath = resolve(rootDirectory, 'src/icon-sets.json')
  const iconFamiliesPath = resolve(rootDirectory, 'node_modules/@fortawesome/fontawesome-free/metadata/icon-families.json')
  const categoriesPath = resolve(rootDirectory, 'node_modules/@fortawesome/fontawesome-free/metadata/categories.yml')
  const outputPath = resolve(rootDirectory, 'src/icons-index.json')

  const [iconSetsRaw, iconFamiliesRaw, categoriesRaw] = await Promise.all([
    readFile(iconSetsPath, 'utf8'),
    readFile(iconFamiliesPath, 'utf8'),
    readFile(categoriesPath, 'utf8'),
  ])

  const iconSets = JSON.parse(iconSetsRaw)
  const iconFamilies = JSON.parse(iconFamiliesRaw)
  const categoriesByIcon = parseCategoriesYaml(categoriesRaw)

  const canonicalByAlias = new Map()
  for (const [iconId, metadata] of Object.entries(iconFamilies)) {
    const aliases = metadata.aliases?.names ?? []
    for (const alias of aliases) {
      if (!canonicalByAlias.has(alias)) {
        canonicalByAlias.set(alias, iconId)
      }
    }
  }

  const iconsIndex = {}

  for (const [style, classNames] of Object.entries(iconSets)) {
    const entries = []

    for (const className of classNames) {
      if (!className.startsWith('fa-')) {
        continue
      }

      const iconId = className.slice(3)
      const canonicalId = iconFamilies[iconId] ? iconId : (canonicalByAlias.get(iconId) ?? iconId)
      const metadata = iconFamilies[canonicalId]

      const aliases = uniqueValues([...(metadata?.aliases?.names ?? [])])
      const searchTerms = uniqueValues([...(metadata?.search?.terms ?? [])])
      const categories = uniqueValues([
        ...(categoriesByIcon.get(canonicalId) ?? []),
        ...(categoriesByIcon.get(iconId) ?? []),
      ])
      const unicode = metadata?.unicode ?? ''

      entries.push({
        id: canonicalId,
        name: metadata?.label ?? canonicalId,
        cssClass: className,
        unicode,
        glyph: unicode ? toGlyph(unicode) : '',
        style,
        family: 'classic',
        aliases,
        categories,
        searchTerms,
      })
    }

    iconsIndex[style] = entries
  }

  await writeFile(outputPath, `${JSON.stringify(iconsIndex, null, 2)}\n`, 'utf8')
}

generateIconsIndex().catch((error) => {
  console.error(error)
  process.exitCode = 1
})
