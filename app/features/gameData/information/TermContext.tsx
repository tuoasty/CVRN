"use client"

import Link from 'next/link'
import { describeAbility } from '@/server/domains/gameData/terms/describeAbility'
import type { TermKind } from '@/server/domains/gameData/terms/types'
import type { Ability } from '@/server/domains/gameData/types/datasets'
import { useInformation } from './InformationProvider'
import { abilityHref } from './abilityLinks'

function linesFor(ability: Ability, kind: TermKind, tag: string): Ability[] {
    if (kind === 'param') return tag in ability.params ? [{ key: ability.key, effects: [], params: { [tag]: ability.params[tag] } }] : []
    return ability.effects
        .filter(e => (kind === 'effect' ? e.tag === tag : e.options !== undefined && tag in e.options))
        .map(e => ({ key: ability.key, effects: [e], params: {} }))
}

export default function TermContext({ kind, tag, abilityKeys }: { kind: TermKind; tag: string; abilityKeys: string[] }) {
    const { abilityByKey, index, context } = useInformation()

    return (
        <div className="mt-4">
            <p className="text-xs font-semibold text-muted-foreground">In context</p>
            <div className="mt-1 grid grid-cols-[minmax(0,12rem)_minmax(0,1fr)] gap-x-4 gap-y-1 text-sm">
                {abilityKeys.map(key => {
                    const ability = abilityByKey.get(key)
                    if (!ability) return null
                    const lines = linesFor(ability, kind, tag).flatMap(a => describeAbility(a, { terms: context.terms }).map(b => b.text))
                    return (
                        <div key={key} className="contents">
                            <Link href={abilityHref(key, index.get(key))} className="truncate text-muted-foreground underline decoration-border underline-offset-4 hover:text-foreground">
                                {key}
                            </Link>
                            <div className="min-w-0">
                                {lines.map((line, i) => <p key={i} className="text-foreground">{line}</p>)}
                            </div>
                        </div>
                    )
                })}
            </div>
        </div>
    )
}
