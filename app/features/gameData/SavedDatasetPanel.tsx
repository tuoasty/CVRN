"use client"

import type { GameDatasetKind } from '@/server/domains/gameData/types/datasets'
import type { StoredGameDatasets } from '@/server/domains/gameData/types/preview'
import type { GameTerm } from '@/server/domains/gameData/terms/types'
import { DATASET_LABELS, DATASET_ROOTS } from '@/server/domains/gameData/helpers/datasets/registry'
import { AbilityTable, AttributeTable, RarityTable, SpecLoadoutTable } from './DatasetTables'

export default function SavedDatasetPanel({ kind, stored, terms }: { kind: GameDatasetKind; stored: StoredGameDatasets; terms: GameTerm[] }) {
    const { payloads } = stored
    const links = { abilities: payloads.abilities, rarities: payloads.rarities, physicals: payloads.physicals, technicals: payloads.technicals, terms }

    return (
        <div className="mt-6">
            <div className="mb-2 flex items-baseline gap-3">
                <span className="text-sm font-semibold">Saved {DATASET_LABELS[kind]}</span>
                <span className="font-mono text-xs text-muted-foreground">{DATASET_ROOTS[kind]}</span>
            </div>
            {kind === 'rarities' && payloads.rarities && <RarityTable rarities={payloads.rarities} />}
            {kind === 'abilities' && payloads.abilities && <AbilityTable abilities={payloads.abilities} links={links} />}
            {kind === 'specLoadouts' && payloads.specLoadouts && <SpecLoadoutTable loadouts={payloads.specLoadouts} links={links} />}
            {kind === 'physicals' && payloads.physicals && <AttributeTable entries={payloads.physicals} links={links} />}
            {kind === 'technicals' && payloads.technicals && <AttributeTable entries={payloads.technicals} links={links} />}
        </div>
    )
}
