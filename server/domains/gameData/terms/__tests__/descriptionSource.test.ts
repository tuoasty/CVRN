import { describe, expect, it } from 'vitest'
import { resolveDescriptionSource } from '../descriptionSource'

const withText = { key: 'Bounce', description: 'Every jump gets +0.8 speed', effects: [], params: {} }
const without = { key: 'Nerfed Bounce', effects: [], params: {} }

describe('resolveDescriptionSource', () => {
    it('defaults to the game text when there is one', () => {
        expect(resolveDescriptionSource(withText, undefined)).toEqual({ source: 'original', switchable: true })
        expect(resolveDescriptionSource(withText, 'derived')).toEqual({ source: 'derived', switchable: true })
    })

    it('is always derived without game text, whatever is stored', () => {
        expect(resolveDescriptionSource(without, 'original')).toEqual({ source: 'derived', switchable: false })
        expect(resolveDescriptionSource({ ...without, description: '  ' }, undefined)).toEqual({ source: 'derived', switchable: false })
    })
})
