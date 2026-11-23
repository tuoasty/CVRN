import type { GameDatasetKind, SpecLoadout } from '../../types/datasets'

export function upgradeStoredPayload(kind: GameDatasetKind, payload: unknown[]): unknown[] {
    if (kind !== 'specLoadouts' && kind !== 'specLoadoutsPaid') return payload
    return (payload as Partial<SpecLoadout>[]).map(loadout => (Array.isArray(loadout.styles) ? loadout : { ...loadout, styles: [] }))
}
