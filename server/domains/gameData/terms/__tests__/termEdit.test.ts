import { describe, expect, it } from 'vitest'
import { fixtureAbilities, fixtureTerms } from '../../__tests__/fixtures/loadFixtures'
import { createAbilityLookup } from '../describeAbility'
import { lineNeedsAttention, normalizeTermDraft, previewTermChange, unseenValue, validateTermDraft } from '../termEdit'
import { collectTermUsage, termId } from '../termUsage'
import type { AbilityBullet } from '../types'

const abilities = fixtureAbilities()
const terms = fixtureTerms()
const lookup = createAbilityLookup(abilities)
const keys = new Set(abilities.map(a => a.key))

describe('term change preview', () => {
    it('previews a shared rewording across every ability using the tag', () => {
        const draft = { ...terms.effects.get('JumpSpeed')!, label: 'jump height' }
        const changes = previewTermChange(abilities, { terms, lookup }, draft)
        expect(changes).toHaveLength(14)
        expect(changes.find(c => c.ability === 'Captains Call')!.after).toContain('  Increased jump height by 0.2 (spike mode only)')
        const athletic = changes.find(c => c.ability === 'Athletic')!
        expect(athletic.before).toContain('Increased jump speed by 0.5')
        expect(athletic.after).toContain('Increased jump height by 0.5')
        expect(athletic.after).not.toContain('Increased jump speed by 0.5')
    })

    it('includes abilities whose granted children change', () => {
        const draft = { ...terms.params.get('CallCaptainJump')!, grants: null }
        expect(previewTermChange(abilities, { terms, lookup }, draft).map(c => c.ability)).toContain('Captains Call')
    })

    it('returns nothing when the draft matches the stored term', () => {
        expect(previewTermChange(abilities, { terms, lookup }, terms.effects.get('JumpSpeed')!)).toEqual([])
    })
})

describe('term draft validation', () => {
    it('rejects unknown placeholders, missing wording and unknown grants', () => {
        expect(validateTermDraft({ ...terms.params.get('Domination')!, template: 'x {foo}' }, keys)).toEqual(['Unknown placeholder {foo}'])
        expect(validateTermDraft({ ...terms.effects.get('JumpSpeed')!, label: '  ' }, keys)).toEqual(['Effects need a label'])
        expect(validateTermDraft({ ...terms.options.get('Mode')!, template: '' }, keys)).toEqual(['Wording is required'])
        expect(validateTermDraft({ ...terms.params.get('CallCaptainJump')!, grants: 'Nope' }, keys)).toEqual(['No ability called "Nope"'])
        expect(validateTermDraft({ ...terms.params.get('CallCaptainJump')!, grants: "captain's jump" }, keys)).toEqual([])
    })

    it('trims and nulls empty fields', () => {
        const draft = normalizeTermDraft({ ...terms.effects.get('JumpSpeed')!, label: ' jump height ', unit: '', template: '  ' })
        expect(draft).toMatchObject({ label: 'jump height', unit: null, template: null })
    })
})

describe('attention and unseen values', () => {
    const bullet = (over: Partial<AbilityBullet>): AbilityBullet => ({ category: 'jump', text: 'x', source: 'effect', mapped: true, guess: false, ...over })

    it('flags guessed or unmapped lines, including children', () => {
        expect(lineNeedsAttention([bullet({})])).toBe(false)
        expect(lineNeedsAttention([bullet({ guess: true })])).toBe(true)
        expect(lineNeedsAttention([bullet({ children: [bullet({ mapped: false })] })])).toBe(true)
    })

    it('warns when a fixed phrase meets a different value', () => {
        const usage = { kind: 'option' as const, tag: 'Below', uses: 2, abilities: [], examples: [1, 2] }
        expect(unseenValue(usage, 'and below', 2)).toBe(true)
        expect(unseenValue(usage, 'and below', 1)).toBe(false)
        expect(unseenValue(usage, 'below by {v}', 2)).toBe(false)
        expect(unseenValue(collectTermUsage(abilities).get(termId('option', 'Below')), 'and below', 1)).toBe(false)
    })
})
