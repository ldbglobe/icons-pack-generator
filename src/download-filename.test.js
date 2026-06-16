import { describe, expect, it } from 'vitest'
import { buildSingleIconDownloadFilename } from './download-filename.js'

describe('buildSingleIconDownloadFilename', () => {
  it('includes the background name, icon name, and colors', () => {
    expect(
      buildSingleIconDownloadFilename({
        backgroundName: 'My Background.png',
        iconName: 'fa-bell',
        colors: ['#ff0000'],
        format: 'png',
      }),
    ).toBe('my-background-png__fa-bell__ff0000.png')
  })

  it('joins multiple colors into the filename', () => {
    expect(
      buildSingleIconDownloadFilename({
        backgroundName: 'folder sample',
        iconName: 'fa-star',
        colors: ['#ff0000', '#00ff00', '#0000ff'],
        format: 'webp',
      }),
    ).toBe('folder-sample__fa-star__ff0000-00ff00-0000ff.webp')
  })

  it('falls back to generic parts when values are missing', () => {
    expect(buildSingleIconDownloadFilename({})).toBe('background__icon__colors.png')
  })
})
