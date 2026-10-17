"use client"

import { InlineSwitch } from '@/app/components/filters/InlineSwitch'
import { describeAbility } from '@/server/domains/gameData/terms/describeAbility'
import { resolveDescriptionSource } from '@/server/domains/gameData/terms/descriptionSource'
import type { Ability } from '@/server/domains/gameData/types/datasets'
import type { AbilityBullet } from '@/server/domains/gameData/terms/types'
import type { DescriptionSource as Source } from '@/server/domains/gameData/types/schemas'
import { useInformation } from './InformationProvider'

const OPTIONS = [
    { value: 'original' as const, label: 'ORIGINAL' },
    { value: 'derived' as const, label: 'DERIVED' },
]

function BulletList({ bullets }: { bullets: AbilityBullet[] }) {
    return (
        <ul className="mt-2 max-w-[70ch] list-disc space-y-1 pl-5 text-sm text-foreground">
            {bullets.map((b, i) => (
                <li key={`${b.tag ?? b.source}-${i}`}>
                    {b.text}
                    {b.children && b.children.length > 0 && (
                        <ul className="mt-1 list-[circle] space-y-0.5 pl-5 text-muted-foreground">
                            {b.children.map((c, j) => <li key={`${c.tag ?? c.source}-${j}`}>{c.text}</li>)}
                        </ul>
                    )}
                </li>
            ))}
        </ul>
    )
}

export default function DescriptionSource({ ability }: { ability: Ability }) {
    const { settings, context, setDescriptionSource } = useInformation()
    const { source, switchable } = resolveDescriptionSource(ability, settings[ability.key])
    const hint = source === 'original'
        ? "Shown publicly: the game's description"
        : switchable ? 'Shown publicly: generated from effects' : 'Shown publicly: generated from effects. The game has no description for this ability.'

    return (
        <div className="mt-5">
            <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
                {switchable
                    ? <InlineSwitch<Source> label="Description source" options={OPTIONS} value={source} onChange={v => void setDescriptionSource(ability.key, v)} className="-ml-2" />
                    : <span className="text-sm font-semibold text-foreground">DERIVED</span>}
                <span className="text-sm text-muted-foreground">{hint}</span>
            </div>
            {source === 'original'
                ? <p className="mt-2 max-w-[70ch] text-sm text-foreground">{ability.description}</p>
                : <BulletList bullets={describeAbility(ability, context)} />}
            {source === 'derived' && switchable && (
                <p className="mt-3 max-w-[70ch] text-xs text-muted-foreground">
                    Game description kept for reference: <s className="decoration-muted-foreground/60">{ability.description}</s>
                </p>
            )}
        </div>
    )
}
