import { describe, expect, it } from 'vitest'
import { getVectorBackgroundCssVariables } from './vector-background.js'

describe('getVectorBackgroundCssVariables', () => {
  it('converts borderSize percent to px based on tile size', () => {
    const smallTileVars = getVectorBackgroundCssVariables({ borderSize: 25 }, 64)
    const largeTileVars = getVectorBackgroundCssVariables({ borderSize: 25 }, 512)

    expect(smallTileVars['--preview-vector-background-border-width']).toBe('16px')
    expect(largeTileVars['--preview-vector-background-border-width']).toBe('128px')
  })

  it('returns 0px border width when borderSize is 0', () => {
    const vars = getVectorBackgroundCssVariables({ borderSize: 0 }, 64)
    expect(vars['--preview-vector-background-border-width']).toBe('0px')
  })
})
