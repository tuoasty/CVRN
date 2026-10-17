"use client"

import Link from 'next/link'
import type { ReactNode } from 'react'
import { describeAbility, describeEffectMain, describeOption, SKIPPED_OPTIONS } from '@/server/domains/gameData/terms/describeAbility'
import { renderTemplate } from '@/server/domains/gameData/terms/template'
import { fmt, humanize } from '@/server/domains/gameData/terms/format'
import type { Ability, ScalarValue } from '@/server/domains/gameData/types/datasets'
import type { GameTerm } from '@/server/domains/gameData/terms/types'
import { useInformation } from './InformationProvider'
import DescriptionSource from './DescriptionSource'
import TermLine, { type TermStatus } from './TermLine'
import { abilityHref, AVAILABILITY_LABELS } from './abilityLinks'

function statusOf(term: GameTerm | undefined, handled: boolean): TermStatus {
    if (!term || !handled) return 'unhandled'
    return term.verified ? 'ok' : 'unverified'
}

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

const show = (value: ScalarValue) => (typeof value === 'number' ? fmt(value) : String(value))

export default function AbilityEditor({ ability }: { ability: Ability }) {
    const { index, terms, context, abilityByKey } = useInformation()
    const entry = index.get(ability.key)
    const activation = describeAbility(ability, context).filter(b => b.source === 'active' || b.source === 'toggle')
    const params = Object.entries(ability.params)
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

            {ability.effects.length > 0 && (
                <Section title="Effects" count={ability.effects.length}>
                    {ability.effects.map((effect, i) => {
                        const term = terms.effects.get(effect.tag)
                        const options = Object.entries(effect.options ?? {}).filter(([key]) => !SKIPPED_OPTIONS.has(key))
                        return (
                            <TermLine
                                key={`${effect.tag}-${i}`}
                                raw={`${effect.op} · ${effect.tag} · ${fmt(effect.amount)}`}
                                sentence={describeEffectMain(effect, terms)}
                                editable={term?.template ? null : term?.label ?? humanize(effect.tag).toLowerCase()}
                                status={statusOf(term, term?.label != null || term?.template != null)}
                            >
                                {options.map(([key, value]) => {
                                    const optionTerm = terms.options.get(key)
                                    const wording = describeOption(key, value, terms)
                                    return (
                                        <TermLine
                                            key={key}
                                            nested
                                            raw={`${key} · ${show(value)}`}
                                            sentence={wording.text}
                                            editable={null}
                                            status={statusOf(optionTerm, wording.mapped)}
                                        />
                                    )
                                })}
                            </TermLine>
                        )
                    })}
                </Section>
            )}

            {params.length > 0 && (
                <Section title="Params" count={params.length}>
                    {params.map(([tag, value]) => {
                        const term = terms.params.get(tag)
                        const handled = term?.template != null
                        const granted = term?.grants ? context.lookup?.(term.grants) : undefined
                        return (
                            <TermLine
                                key={tag}
                                raw={`${tag} · ${show(value)}`}
                                sentence={handled ? renderTemplate(term!.template!, value) : value === 1 || value === true ? humanize(tag) : `${humanize(tag)}: ${value}`}
                                editable={null}
                                status={statusOf(term, handled)}
                            >
                                {term?.grants && (
                                    <div className="pl-5 pt-2 text-sm">
                                        <span className="text-muted-foreground">Grants </span>
                                        {granted
                                            ? <Link href={abilityHref(granted.key, index.get(granted.key))} className="text-foreground underline decoration-border underline-offset-4 hover:decoration-foreground">{granted.key}</Link>
                                            : <span className="text-foreground">{term.grants}</span>}
                                        {granted && (
                                            <ul className="mt-1 space-y-0.5 text-muted-foreground">
                                                {describeAbility(granted, { terms }).map((b, j) => <li key={j}>{b.text}</li>)}
                                            </ul>
                                        )}
                                    </div>
                                )}
                            </TermLine>
                        )
                    })}
                </Section>
            )}

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
