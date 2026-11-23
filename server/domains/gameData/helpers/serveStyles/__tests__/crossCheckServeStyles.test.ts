import { describe, expect, it } from 'vitest'
import { crossCheckServeStyles } from '../crossCheckServeStyles'
import { styleTunables } from '../styleTunable'
import { fixtureDataset } from '../../../__tests__/fixtures/loadFixtures'
import type { SpecLoadout } from '../../../types/datasets'

const serveStyles = () => fixtureDataset('serve-styles.txt', 'serveStyles')
const serveStyleValues = () => fixtureDataset('serve-style-values.txt', 'serveStyleValues')

function spec(key: string, styles: SpecLoadout['styles']): SpecLoadout {
    return { key, name: key, height: 1, cooldown: 1, endOnSpike: false, maxPower: 1, activeMaxPower: 1, passive: [], active: [], tuning: [], styles }
}

describe('styleTunables', () => {
    it('matches a style to the values its spaceless name starts', () => {
        expect(styleTunables('Dive Bomb', serveStyleValues())).toEqual([{ key: 'DiveBombTopDrop', value: 2.5 }])
    })
})

describe('crossCheckServeStyles', () => {
    it('maps every real style to exactly one value', () => {
        expect(crossCheckServeStyles({ serveStyles: serveStyles(), serveStyleValues: serveStyleValues() })).toEqual([])
    })

    it('errors on a style with no value', () => {
        const issues = crossCheckServeStyles({ serveStyles: [{ name: 'Lob' }], serveStyleValues: [] })
        expect(issues).toEqual([{ level: 'error', kind: 'serveStyleValues', entry: 'Lob', message: 'No value for this style' }])
    })

    it('errors on a style matching two values', () => {
        const issues = crossCheckServeStyles({ serveStyles: [{ name: 'Lob' }], serveStyleValues: [{ key: 'LobA', value: 1 }, { key: 'LobB', value: 2 }] })
        expect(issues).toEqual([{ level: 'error', kind: 'serveStyleValues', entry: 'Lob', message: 'Matches 2 values: LobA, LobB' }])
    })

    it('warns on a value matching no style', () => {
        const issues = crossCheckServeStyles({ serveStyles: [], serveStyleValues: [{ key: 'Orphan', value: 1 }] })
        expect(issues).toEqual([{ level: 'warning', kind: 'serveStyleValues', entry: 'Orphan', message: 'Matches no serve style' }])
    })

    it('errors on an unknown spec style name in either loadout kind', () => {
        const bad = [spec('A', [{ name: 'Lob', value: 1 }])]
        const issues = crossCheckServeStyles({ serveStyles: serveStyles(), specLoadouts: bad, specLoadoutsPaid: bad })
        expect(issues).toEqual([
            { level: 'error', kind: 'specLoadouts', entry: 'A', message: 'Unknown serve style "Lob"' },
            { level: 'error', kind: 'specLoadoutsPaid', entry: 'A', message: 'Unknown serve style "Lob"' },
        ])
    })

    it('warns on a Custom loadout key with no League loadout', () => {
        const issues = crossCheckServeStyles({ specLoadouts: [spec('A', [])], specLoadoutsPaid: [spec('A', []), spec('B', [])] })
        expect(issues).toEqual([{ level: 'warning', kind: 'specLoadoutsPaid', entry: 'B', message: 'No League loadout with this key, the Custom kit will not show' }])
    })

    it('skips every check whose inputs are missing', () => {
        expect(crossCheckServeStyles({ specLoadouts: [spec('A', [{ name: 'Lob', value: 1 }])] })).toEqual([])
    })
})
