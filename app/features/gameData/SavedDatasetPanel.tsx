"use client"

import type { GameDatasetKind } from '@/server/domains/gameData/types/datasets'
import type { StoredGameDatasets } from '@/server/domains/gameData/types/preview'
import { DATASET_LABELS, DATASET_ROOTS } from '@/server/domains/gameData/helpers/datasets/registry'
import { AbilityTable, AttributeTable, RarityTable } from './DatasetTables'

export default function SavedDatasetPanel({ kind, stored }: { kind: GameDatasetKind; stored: StoredGameDatasets }) {
    const { payloads } = stored
    const links = { abilities: payloads.abilities, rarities: payloads.rarities }

    return (
        <div className="panel">
            <div className="flex items-center gap-3 p-4 border-b border-border">
                <span className="font-semibold">Saved {DATASET_LABELS[kind]}</span>
                <span className="font-mono text-xs text-muted-foreground">{DATASET_ROOTS[kind]}</span>
            </div>
            {kind === 'rarities' && payloads.rarities && <RarityTable rarities={payloads.rarities} />}
            {kind === 'abilities' && payloads.abilities && <AbilityTable abilities={payloads.abilities} />}
            {kind === 'physicals' && payloads.physicals && <AttributeTable entries={payloads.physicals} links={links} />}
            {kind === 'technicals' && payloads.technicals && <AttributeTable entries={payloads.technicals} links={links} />}
        </div>
    )
}
