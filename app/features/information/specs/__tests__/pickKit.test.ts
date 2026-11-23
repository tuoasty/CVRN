import { describe, expect, it } from 'vitest'
import type { PublicSpecKit } from '@/server/domains/gameData'
import { pickKit } from '../pickKit'

const L: PublicSpecKit = { cooldown: 200, active: [], passive: [], styles: [] }
const C: PublicSpecKit = { cooldown: 150, active: [], passive: [], styles: [] }

describe('pickKit', () => {
    it('defaults to League', () => {
        expect(pickKit(L, C, null)).toEqual({ kit: L, choice: 'league', canSwitch: true })
    })

    it('picks Custom from the param', () => {
        expect(pickKit(L, C, 'custom')).toEqual({ kit: C, choice: 'custom', canSwitch: true })
    })

    it('falls back to League without a custom kit', () => {
        expect(pickKit(L, undefined, 'custom')).toEqual({ kit: L, choice: 'league', canSwitch: false })
    })

    it('ignores an unknown param', () => {
        expect(pickKit(L, C, 'x').choice).toBe('league')
    })

    it('cannot switch without a League kit', () => {
        expect(pickKit(undefined, C, 'custom')).toEqual({ kit: undefined, choice: 'league', canSwitch: false })
    })
})
