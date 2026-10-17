"use client"

import Link from 'next/link'
import type { ReactNode } from 'react'
import { describeAbility } from '@/server/domains/gameData/terms/describeAbility'
import { resolveDescriptionSource } from '@/server/domains/gameData/terms/descriptionSource'
import type { Ability } from '@/server/domains/gameData/types/datasets'
import { useInformation } from './InformationProvider'
import DescriptionSource from './DescriptionSource'
import AbilityLines from './AbilityLines'
import { abilityHref, AVAILABILITY_LABELS } from './abilityLinks'

function Section({ title, count, children }: { title: string; count: number; children: ReactNode }) {
    return (
        <section className="mt-8">
            <h3 className="flex items-baseline gap-2 border-b border-border pb-2 text-sm font-semibold text-foreground">
                {title}
                <span className="font-mono text-xs font-normal tabular-nums text-muted-foreground">{count}</span>
            </h3>
            <div className="divide-y divide-border/40">{children}</div>
        </section>
    )
}

export default function AbilityEditor({ ability }: { ability: Ability }) {
    const { index, context, abilityByKey, settings } = useInformation()
    const entry = index.get(ability.key)
    const activation = describeAbility(ability, context).filter(b => b.source === 'active' || b.source === 'toggle')
    const grants = entry?.grants ?? []

    return (
        <article className="pb-16">
            <h2 className="text-xl font-semibold tracking-tight text-foreground">{ability.key}</h2>
            <p className="mt-0.5 text-sm text-muted-foreground">
                {entry ? AVAILABILITY_LABELS[entry.availability] : 'Unknown'}
                {entry?.rarity && <> · {entry.rarity}</>}
                {entry?.variantOf && (
                    <> · Variant of <Link href={abilityHref(entry.variantOf, index.get(entry.variantOf))} className="text-foreground underline decoration-border underline-offset-4 hover:decoration-foreground">{entry.variantOf}</Link> ({entry.modifier})</>
                )}
            </p>
            {activation.length > 0 && (
                <p className="mt-1 text-sm text-muted-foreground">{activation.map(b => b.text).join(' · ')}</p>
            )}

            <DescriptionSource ability={ability} />

            {resolveDescriptionSource(ability, settings[ability.key]).source === 'derived' && <AbilityLines ability={ability} />}

            {grants.length > 0 && (
                <Section title="Teammates get" count={grants.length}>
                    {grants.map(g => (
                        <div key={`${g.source}-${g.name}`} className="flex items-baseline gap-3 py-2 text-sm">
                            {g.key
                                ? <Link href={abilityHref(g.key, index.get(g.key))} className="text-foreground underline decoration-border underline-offset-4 hover:decoration-foreground">{abilityByKey.get(g.key)?.key ?? g.name}</Link>
                                : <span className="text-foreground">{g.name}</span>}
                            <span className="text-xs text-muted-foreground">{g.source === 'aura' ? 'Aura' : 'Team'}</span>
                        </div>
                    ))}
                </Section>
            )}
        </article>
    )
}
