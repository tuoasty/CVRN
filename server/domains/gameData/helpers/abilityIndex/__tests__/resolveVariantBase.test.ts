import { describe, expect, it } from 'vitest'
import { createVariantResolver } from '../resolveVariantBase'

const KEYS = [
    'Bounce',
    'Nerfed Bounce',
    'Team Nerfed Bounce',
    'Spin Control',
    'Buffed Spin Control',
    'Slightly Buffed Spin Control',
    'Captains Call',
    'Captains Call - Wall',
    'Broad Blocker',
    'Nerfed broad blocker',
    'Wreckage',
    'Slightly Buffed Old Wreckage',
    'Step Approach',
    'Buffed step Approach',
    'Wingspan',
    '+0.35 Wingspan',
    'Negates Too Low',
    'Slightly Negates Too Low',
    'Backrow Blitz',
    'Halved Wingspan',
    'Mind Reader',
    'Auto Mind Reader',
    'Perfection',
    'Special - Perfection',
    'Critical - Dominance',
    'Buffed Dumps 30%',
    'Mayano Bounce',
    'Slight Ape Buff',
    'Nerfed Slight Ape Buff',
]

const resolve = createVariantResolver(KEYS)

describe('resolveVariantBase', () => {
    it.each([
        ['Nerfed Bounce', 'Bounce', 'Nerfed'],
        ['Slightly Buffed Spin Control', 'Spin Control', 'Slightly Buffed'],
        ['Nerfed broad blocker', 'Broad Blocker', 'Nerfed'],
        ['Buffed step Approach', 'Step Approach', 'Buffed'],
        ['+0.35 Wingspan', 'Wingspan', '+0.35'],
        ['Halved Wingspan', 'Wingspan', 'Halved'],
        ['Auto Mind Reader', 'Mind Reader', 'Auto'],
        ['Nerfed Slight Ape Buff', 'Slight Ape Buff', 'Nerfed'],
    ])('%s -> %s (%s)', (key, base, modifier) => {
        expect(resolve(key)).toEqual({ base, modifier })
    })

    it.each([
        'Bounce',
        'Team Nerfed Bounce',
        'Captains Call - Wall',
        'Slightly Buffed Old Wreckage',
        'Slightly Negates Too Low',
        'Special - Perfection',
        'Critical - Dominance',
        'Buffed Dumps 30%',
        'Mayano Bounce',
        'Slight Ape Buff',
    ])('%s has no base', key => {
        expect(resolve(key)).toBeUndefined()
    })

    it('resolves names that are not catalog keys', () => {
        expect(resolve('+0.1 Backrow Blitz')).toEqual({ base: 'Backrow Blitz', modifier: '+0.1' })
        expect(resolve('Slightly Buffed Bounce')).toEqual({ base: 'Bounce', modifier: 'Slightly Buffed' })
        expect(resolve('+0.2 Spin Control')).toEqual({ base: 'Spin Control', modifier: '+0.2' })
        expect(resolve('-0.1 Backrow Blitz')).toEqual({ base: 'Backrow Blitz', modifier: '-0.1' })
        expect(resolve('+0.5 Set Reach')).toBeUndefined()
        expect(resolve('+0.2,13 Feint')).toBeUndefined()
    })
})
