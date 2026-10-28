'use client'

import { useState } from 'react'
import { Button } from '@/app/components/ui/button'
import { generatePlayerCardAction } from '@/app/actions/playerCard.actions'
import { usePlayerCards } from '@/app/hooks/usePlayerCard'
import { toast } from '@/app/utils/toast'
import { pickTierTemplate } from '@/server/domains/playerCard/helpers/toCardShapes'
import type { CardGroup, PlayerCard } from '@/server/domains/playerCard'
import type { OverallDisplayRow } from '@/app/features/overall/overallRows'

const LINK = 'text-xs text-primary hover:underline underline-offset-4 rounded-sm focus:outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50'

function formatDate(iso: string) {
    return new Date(iso).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' })
}

export default function PlayerCardWorkbench({
    player,
    seasonNumber,
    group,
    groups,
}: {
    player: OverallDisplayRow
    seasonNumber: number
    group: CardGroup
    groups: CardGroup[]
}) {
    const { cards, isLoading, error, mutate } = usePlayerCards(player.playerId, seasonNumber)
    const [generating, setGenerating] = useState(false)

    const card = cards.find(c => c.groupId === group.id) ?? null
    const otherCards = cards.filter(c => c.groupId !== group.id)
    const projected = pickTierTemplate(group.templates, player.ovr)
    const cardTier = card ? group.templates.find(t => t.id === card.templateId)?.tier : undefined

    async function handleGenerate() {
        setGenerating(true)
        try {
            const result = await generatePlayerCardAction({ playerId: player.playerId, seasonNumber, groupId: group.id })
            if (!result.ok) {
                toast.error('Card generation failed', result.error.message)
                return
            }
            await mutate(
                (current: PlayerCard[] | undefined) => [...(current ?? []).filter(c => c.groupId !== group.id), result.value],
                { revalidate: false },
            )
            toast.success(`${group.name} card generated for ${player.username}`)
        } finally {
            setGenerating(false)
        }
    }

    return (
        <div className="flex flex-col gap-4">
            <div className="flex flex-col gap-0.5">
                <span className="text-base font-semibold text-foreground">{player.username}</span>
                <span className="font-mono text-xs tabular-nums text-muted-foreground">
                    OVR {player.ovr}{player.position ? ` · ${player.position}` : ''}{player.teamName ? ` · ${player.teamName}` : ''}
                </span>
                <span className="text-xs text-muted-foreground">
                    {projected
                        ? <>{group.name} tier {projected.tier} ({projected.name})</>
                        : <span className="text-destructive">{group.name} has no tier for OVR {player.ovr}</span>}
                </span>
            </div>

            {isLoading ? (
                <div className="aspect-[5/7] w-full max-w-sm animate-pulse bg-muted" />
            ) : error ? (
                <p className="text-sm text-destructive">{error}</p>
            ) : card ? (
                <img src={card.imageUrl} alt={`${player.username} ${group.name} card`} className="w-full max-w-sm border border-border" />
            ) : (
                <div className="flex aspect-[5/7] w-full max-w-sm items-center justify-center border border-dashed border-border">
                    <span className="text-sm text-muted-foreground">No {group.name} card yet</span>
                </div>
            )}

            <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
                <Button size="sm" className="rounded-sm" disabled={generating || !projected} onClick={handleGenerate}>
                    {generating ? 'Generating...' : card ? 'Regenerate' : 'Generate'}
                </Button>
                {card && (
                    <a href={card.imageUrl} target="_blank" rel="noreferrer" className={LINK}>Open PNG</a>
                )}
            </div>

            {card && (
                <p className="font-mono text-xs tabular-nums text-muted-foreground">
                    Card OVR {card.ovr}{cardTier ? ` · T${cardTier}` : ''} · {formatDate(card.generatedAt)}
                    {card.ovr !== player.ovr && <span className="text-foreground"> · current OVR is {player.ovr}, regenerate to update</span>}
                </p>
            )}

            {otherCards.length > 0 && (
                <div className="flex flex-col gap-1 border-t border-border pt-3">
                    <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Other cards this season</span>
                    {otherCards.map(c => (
                        <div key={c.groupId} className="flex items-baseline gap-3 text-xs">
                            <span className="text-foreground">{groups.find(g => g.id === c.groupId)?.name ?? 'Unknown group'}</span>
                            <span className="font-mono tabular-nums text-muted-foreground">OVR {c.ovr} · {formatDate(c.generatedAt)}</span>
                            <a href={c.imageUrl} target="_blank" rel="noreferrer" className={LINK}>Open</a>
                        </div>
                    ))}
                </div>
            )}
        </div>
    )
}
