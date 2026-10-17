import { describe, expect, it } from 'vitest'
import { fixtureAbilities, fixtureTerms } from '../../__tests__/fixtures/loadFixtures'
import { describeEffectMain } from '../describeAbility'
import { editableTemplate, effectTermFields, fromEditParts, setTemplateFormat, templateFormat, joinSegments, materializeEffectTemplate, parseTemplate, slotForFormat, toEditParts, type EditPart } from '../segments'
import { renderTemplate } from '../template'
import { collectTermUsage, termId } from '../termUsage'

describe('template segments', () => {
    it('splits text runs and slots and joins them back', () => {
        const template = '{change} jump speed by {abs}s'
        const segments = parseTemplate(template)
        expect(segments).toEqual([
            { kind: 'slot', name: 'change' },
            { kind: 'text', text: ' jump speed by ' },
            { kind: 'slot', name: 'abs' },
            { kind: 'text', text: 's' },
        ])
        expect(joinSegments(segments)).toBe(template)
        expect(parseTemplate('standing jumps')).toEqual([{ kind: 'text', text: 'standing jumps' }])
    })

    it('materializes every generic effect line to the same text', () => {
        const terms = fixtureTerms()
        for (const ability of fixtureAbilities()) {
            for (const effect of ability.effects) {
                const term = terms.effects.get(effect.tag)
                if (!term || term.template) continue
                const template = materializeEffectTemplate(effect.op, term.label!, term.unit)
                expect(renderTemplate(template, effect.amount)).toBe(describeEffectMain(effect, terms))
            }
        }
    })

    it('keeps label-only edits as a label', () => {
        expect(effectTermFields('{change} jump height by {abs}', 'add', null, 'jump speed')).toEqual({ label: 'jump height', template: null })
        expect(effectTermFields('{change} spike windup by {abs}s', 'add', 's', 'x')).toEqual({ label: 'spike windup', template: null })
        expect(effectTermFields('Max power set to {v}', 'set', null, 'x')).toEqual({ label: 'max power', template: null })
    })

    it('stores anything else as a template', () => {
        expect(effectTermFields('Raised jump speed by {abs}', 'add', null, 'jump speed')).toEqual({ label: 'jump speed', template: 'Raised jump speed by {abs}' })
        expect(effectTermFields('{change} jump speed to {pct}', 'add', null, 'jump speed')).toEqual({ label: 'jump speed', template: '{change} jump speed to {pct}' })
    })
})

describe('editable templates', () => {
    it('starts from the stored template, the generic effect wording or the humanized tag', () => {
        const terms = fixtureTerms()
        expect(editableTemplate('param', 'Domination', terms.params.get('Domination'), 1)).toBe('Guaranteed receive break')
        expect(editableTemplate('effect', 'JumpSpeed', terms.effects.get('JumpSpeed'), 0.8, 'add')).toBe('{change} jump speed by {abs}')
        expect(editableTemplate('effect', 'NewThing', undefined, 2, 'scale')).toBe('{scaleChange} new thing by {pctChange}%')
        expect(editableTemplate('param', 'BrandNewFlag', undefined, 1)).toBe('Brand new flag')
        expect(editableTemplate('param', 'BrandNewCount', undefined, 3)).toBe('Brand new count: {v}')
        expect(editableTemplate('option', 'Wobble', undefined, 'Hard')).toBe('wobble: {text}')
    })
})

describe('sign tracking', () => {
    it('marks tags that both raise and lower', () => {
        const usage = collectTermUsage(fixtureAbilities())
        expect(usage.get(termId('effect', 'DigWidth'))).toMatchObject({ op: 'add', mixedSigns: true })
        expect(usage.get(termId('effect', 'JumpSpeed'))?.mixedSigns).toBe(false)
        expect(usage.get(termId('param', 'Domination'))?.mixedSigns).toBe(false)
    })
})

describe('edit parts', () => {
    it('shows the verb as plain text and keeps it following the sign when untouched', () => {
        const parts = toEditParts('{change} jump speed by {abs}', -0.2)
        expect(parts).toEqual([
            { kind: 'text', text: 'Reduced jump speed by ', verb: { slot: 'change', word: 'Reduced' } },
            { kind: 'value', slot: 'abs' },
        ])
        expect(fromEditParts(parts)).toBe('{change} jump speed by {abs}')
        const edited: EditPart[] = [{ ...parts[0], text: 'Reduced jump height by ' } as EditPart, parts[1]]
        expect(fromEditParts(edited)).toBe('{change} jump height by {abs}')
        expect(fromEditParts([{ ...parts[0], text: 'Lowers jump by ' } as EditPart, parts[1]])).toBe('Lowers jump by {abs}')
    })

    it('folds the percent sign into a percent change value', () => {
        const parts = toEditParts('{scaleChange} dive distance by {pctChange}%', 1.25)
        expect(parts).toEqual([
            { kind: 'text', text: 'Increased dive distance by ', verb: { slot: 'scaleChange', word: 'Increased' } },
            { kind: 'value', slot: 'pctChange' },
        ])
        expect(fromEditParts(parts)).toBe('{scaleChange} dive distance by {pctChange}%')
    })

    it('round-trips every stored template', () => {
        for (const term of [...fixtureTerms().params.values(), ...fixtureTerms().effects.values(), ...fixtureTerms().options.values()]) {
            if (term.template) expect(fromEditParts(toEditParts(term.template, 1))).toBe(term.template)
        }
    })

    it('maps formats to placeholders', () => {
        expect(slotForFormat('integer', 'v')).toBe('int')
        expect(slotForFormat('percentage', 'abs', 'scale')).toBe('pctChange')
        expect(slotForFormat('percentage', 'v', 'add')).toBe('pct')
        expect(slotForFormat('decimal', 'pct')).toBe('abs')
        expect(slotForFormat('decimal', 'v')).toBe('v')
    })
})

describe('template number format', () => {
    it('reads and swaps the number format in a raw template', () => {
        expect(templateFormat('Max power raised to {v}')).toEqual({ slot: 'v', format: 'decimal' })
        expect(templateFormat('standing jumps')).toBeNull()
        expect(templateFormat('up to {height}')).toEqual({ slot: 'height', format: null })
        expect(setTemplateFormat('Max power raised to {v}', 'integer')).toBe('Max power raised to {int}')
        expect(setTemplateFormat('Arms {pctChange}% longer', 'decimal', 'scale')).toBe('Arms {abs} longer')
        expect(setTemplateFormat('Glide {v} stronger', 'percentage', 'scale')).toBe('Glide {pctChange}% stronger')
        expect(setTemplateFormat('{change} jump by {abs}', 'percentage', 'add')).toBe('{change} jump by {pct}')
    })
})
