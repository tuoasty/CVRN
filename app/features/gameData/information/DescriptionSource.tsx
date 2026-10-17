"use client"

import { InlineSwitch } from '@/app/components/filters/InlineSwitch'
import { resolveDescriptionSource } from '@/server/domains/gameData/terms/descriptionSource'
import type { Ability } from '@/server/domains/gameData/types/datasets'
import type { DescriptionSource as Source } from '@/server/domains/gameData/types/schemas'
import { useInformation } from './InformationProvider'

const OPTIONS = [
    { value: 'original' as const, label: 'ORIGINAL' },
    { value: 'derived' as const, label: 'DERIVED' },
]

export default function DescriptionSource({ ability }: { ability: Ability }) {
    const { settings, setDescriptionSource } = useInformation()
    const { source, switchable } = resolveDescriptionSource(ability, settings[ability.key])
    const hint = source === 'original'
        ? "Shown publicly: the game's description"
        : switchable ? 'Shown publicly: generated from the lines below' : 'Shown publicly: generated from the lines below. The game has no description for this ability.'

    return (
        <div className="mt-5">
            <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
                {switchable
                    ? <InlineSwitch<Source> label="Description source" options={OPTIONS} value={source} onChange={v => void setDescriptionSource(ability.key, v)} className="-ml-2" />
                    : <span className="text-sm font-semibold text-foreground">DERIVED</span>}
                <span className="text-sm text-muted-foreground">{hint}</span>
            </div>
            {source === 'original' && <p className="mt-2 max-w-[70ch] text-sm text-foreground">{ability.description}</p>}
            {source === 'derived' && switchable && (
                <p className="mt-3 max-w-[70ch] text-xs text-muted-foreground">
                    Game description kept for reference: <s className="decoration-muted-foreground/60">{ability.description}</s>
                </p>
            )}
        </div>
    )
}
