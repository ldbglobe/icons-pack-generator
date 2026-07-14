import { describe, expect, it } from 'vitest'
import {
  buildBackgroundAssetFilenamePart,
  buildSingleIconDownloadFilename,
} from './download-filename.js'

describe('buildSingleIconDownloadFilename', () => {
  it('includes the background name, icon name, and colors', () => {
    expect(
      buildSingleIconDownloadFilename({
        backgroundFolder: 'australis_folder',
        backgroundName: 'My Background.png',
        iconName: 'fa-bell',
        colors: ['#ff0000'],
        format: 'png',
      }),
    ).toBe('australis-folder-my-background-png__fa-bell__ff0000.png')
  })

  it('joins multiple colors into the filename', () => {
    expect(
      buildSingleIconDownloadFilename({
        backgroundFolder: 'borealis_folder',
        backgroundName: 'folder sample',
        iconName: 'fa-star',
        colors: ['#ff0000', '#00ff00', '#0000ff'],
        format: 'webp',
      }),
    ).toBe('borealis-folder-folder-sample__fa-star__ff0000-00ff00-0000ff.webp')
  })

  it('falls back to generic parts when values are missing', () => {
    expect(buildSingleIconDownloadFilename({})).toBe('background__icon__colors.png')
  })

  it('builds a normalized background filename part from folder and file names', () => {
    expect(
      buildBackgroundAssetFilenamePart({
        backgroundFolder: 'borealis_folder',
        backgroundName: 'sysc_blue',
      }),
    ).toBe('borealis-folder-sysc-blue')
  })

  it('builds a normalized filename part for vector backgrounds', () => {
    expect(
      buildBackgroundAssetFilenamePart({
        backgroundMode: 'vector',
        vectorPresetLabel: 'Blue gradient',
        vectorShape: 'circle',
      }),
    ).toBe('vector-circle-blue-gradient')
  })

  it('uses vector metadata in the single icon filename when requested', () => {
    expect(
      buildSingleIconDownloadFilename({
        backgroundMode: 'vector',
        vectorPresetLabel: 'Pink outline',
        vectorShape: 'rounded-md',
        vectorVariant: 'border 5',
        iconName: 'fa-heart',
        colors: ['#ffffff'],
        format: 'png',
      }),
    ).toBe('vector-rounded-md-pink-outline-border-5__fa-heart__ffffff.png')
  })
})
