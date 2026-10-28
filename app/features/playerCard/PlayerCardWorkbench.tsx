'use client'

import { useMemo, useState } from 'react'
import { Button } from '@/app/components/ui/button'
import { generatePlayerCardAction } from '@/app/actions/playerCard.actions'
import { saveCardGroupLayers, useCardPreview, usePlayerCards } from '@/app/hooks/usePlayerCard'
import { toast } from '@/app/utils/toast'
import { pickTierTemplate } from '@/server/domains/playerCard/helpers/toCardShapes'
import type { CardGroup, CardLayer, CardOverrides, PlayerCard } from '@/server/domains/playerCard'
import type { OverallDisplayRow } from '@/app/features/overall/overallRows'
import CardLayoutEditor from './CardLayoutEditor'
import CardLayoutPreview from './CardLayoutPreview'
import CardOverridesForm, { hasOverrides } from './CardOverridesForm'
import { layerProblem } from './cardSegments'

const LINK = 'text-xs text-primary hover:underline underline-offset-4 rounded-sm focus:outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50 disabled:opacity-40 disabled:no-underline'
const SECTION = 'text-xs font-semibold uppercase tracking-wider text-muted-foreground'

export type LayoutDrafts = Record<string, CardLayer[]>

function formatDate(iso: string) {
    return new Date(iso).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' })
}

function cleanOverrides(overrides: CardOverrides): CardOverrides {
    const attributes = Object.fromEntries(Object.entries(overrides.attributes ?? {}).filter(([, v]) => v !== undefined))
    return {
        ...(overrides.username?.trim() ? { username: overrides.username.trim() } : {}),
        ...(overrides.ovr !== undefined ? { ovr: overrides.ovr } : {}),
        ...(overrides.position !== undefined ? { position: overrides.position } : {}),
        ...(Object.keys(attributes).length > 0 ? { attributes } : {}),
    }
}

export default function PlayerCardWorkbench({
    player,
    seasonNumber,
    group,
    groups,
    drafts,
    onDraftsChange,
}: {
    player: OverallDisplayRow
    seasonNumber: number
    group: CardGroup
    groups: CardGroup[]
    drafts: LayoutDrafts
    onDraftsChange: (drafts: LayoutDrafts) => void
}) {
    const { cards, mutate } = usePlayerCards(player.playerId, seasonNumber)
    const [overrides, setOverrides] = useState<CardOverrides>({})
    const [activeIndex, setActiveIndex] = useState<number | null>(null)
    const [showBorders, setShowBorders] = useState(true)
    const [saving, setSaving] = useState(false)
    const [generating, setGenerating] = useState(false)

    const cleaned = useMemo(() => cleanOverrides(overrides), [overrides])
    const effectiveOvr = cleaned.ovr ?? player.ovr
    const template = pickTierTemplate(group.templates, effectiveOvr)

    const savedLayers = group.layers ?? []
    const draft = drafts[group.id]
    const layers = draft ?? savedLayers
    const dirty = draft !== undefined && JSON.stringify(draft) !== JSON.stringify(savedLayers)
    const layoutProblem = layers.length === 0 ? 'Add at least one segment' : layers.map(layerProblem).find(Boolean) ?? null

    const preview = useCardPreview(template && !layoutProblem
        ? { playerId: player.playerId, seasonNumber, templateId: template.id, layers, overrides: cleaned }
        : null)

    const card = cards.find(c => c.groupId === group.id) ?? null
    const otherCards = cards.filter(c => c.groupId !== group.id)

    const setLayers = (next: CardLayer[]) => {
        onDraftsChange({ ...drafts, [group.id]: next })
    }

    const discardDraft = () => {
        const { [group.id]: _discarded, ...rest } = drafts
        onDraftsChange(rest)
        setActiveIndex(null)
    }

    async function handleSave() {
        if (!draft) return
        setSaving(true)
        try {
            const result = await saveCardGroupLayers(group.id, draft)
            if (!result.ok) {
                toast.error('Failed to save layout', result.error.message)
                return
            }
            const { [group.id]: _saved, ...rest } = drafts
            onDraftsChange(rest)
            toast.success(`Saved ${group.name} layout for all its tiers`)
        } finally {
            setSaving(false)
        }
    }

    async function handleGenerate() {
        setGenerating(true)
        try {
            const result = await generatePlayerCardAction({
                playerId: player.playerId,
                seasonNumber,
                groupId: group.id,
                overrides: cleaned,
            })
            if (!result.ok) {
                toast.error('Card generation failed', result.error.message)
                return
            }
            await mutate(
                (current: PlayerCard[] | undefined) => [...(current ?? []).filter(c => c.groupId !== group.id), result.value],
                { revalidate: false },
            )
            setOverrides({})
            toast.success(`${group.name} card generated for ${player.username}`)
        } finally {
            setGenerating(false)
        }
    }

    const generateBlocker = !template
        ? `${group.name} has no tier for OVR ${effectiveOvr}`
        : dirty
            ? 'Save or discard layout changes before generating'
            : layoutProblem

    return (
        <div className="flex flex-col gap-6">
            <div className="flex flex-col gap-0.5">
                <span className="text-base font-semibold text-foreground">{player.username}</span>
                <span className="font-mono text-xs tabular-nums text-muted-foreground">
                    OVR {player.ovr}{player.position ? ` · ${player.position}` : ''}{player.teamName ? ` · ${player.teamName}` : ''}
                </span>
                <span className="text-xs text-muted-foreground">
                    {template
                        ? <>{group.name} T{template.rank} {template.name} art{cleaned.ovr !== undefined && ` · from overridden OVR ${cleaned.ovr}`}</>
                        : <span className="text-destructive">{group.name} has no tier for OVR {effectiveOvr}</span>}
                </span>
            </div>

            <div className="flex flex-col gap-8 xl:flex-row xl:items-start">
                <div className="flex min-w-0 flex-1 flex-col gap-8">
                    <div className="flex flex-col gap-2">
                        <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
                            <span className={SECTION}>Layout · all {group.name} tiers</span>
                            {dirty && <span className="text-xs text-foreground">Unsaved changes</span>}
                            <button type="button" className={LINK} disabled={!dirty || saving} onClick={handleSave}>
                                {saving ? 'Saving...' : 'Save layout'}
                            </button>
                            <button type="button" className={LINK} disabled={!dirty || saving} onClick={discardDraft}>
                                Discard
                            </button>
                        </div>
                        {group.layersProblem && !draft && (
                            <p className="text-xs text-destructive">{group.layersProblem}</p>
                        )}
                        <CardLayoutEditor
                            layers={layers}
                            activeIndex={activeIndex}
                            onChange={setLayers}
                            onActivate={setActiveIndex}
                        />
                    </div>

                    <CardOverridesForm
                        overrides={overrides}
                        onChange={setOverrides}
                        computed={{ username: player.username, ovr: player.ovr, position: player.position, attributes: player.attributes }}
                    />
                </div>

                <div className="flex w-full flex-col gap-3 xl:w-[22rem] xl:shrink-0">
                    <div className="flex items-baseline gap-3">
                        <span className={SECTION}>Preview</span>
                        <button type="button" className={LINK} onClick={() => setShowBorders(b => !b)}>
                            {showBorders ? 'Hide borders' : 'Show borders'}
                        </button>
                    </div>
                    {template ? (
                        <CardLayoutPreview
                            image={preview.image}
                            width={group.width}
                            height={group.height}
                            layers={layers}
                            activeIndex={activeIndex}
                            isRendering={preview.isRendering}
                            error={layoutProblem ?? preview.error}
                            showBorders={showBorders}
                            onActivate={setActiveIndex}
                        />
                    ) : (
                        <div className="flex aspect-[5/7] w-full items-center justify-center border border-dashed border-border">
                            <span className="text-sm text-muted-foreground">No tier for OVR {effectiveOvr}</span>
                        </div>
                    )}

                    <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
                        <Button size="sm" className="rounded-sm" disabled={generating || !!generateBlocker} onClick={handleGenerate}>
                            {generating ? 'Generating...' : card ? 'Regenerate' : 'Generate'}
                        </Button>
                        {hasOverrides(cleaned) && <span className="text-xs text-foreground">With overrides</span>}
                    </div>
                    {generateBlocker && <p className="text-xs text-muted-foreground">{generateBlocker}</p>}

                    <div className="flex flex-col gap-2 border-t border-border pt-3">
                        <span className={SECTION}>Saved cards this season</span>
                        {card ? (
                            <div className="flex items-start gap-3">
                                <a href={card.imageUrl} target="_blank" rel="noreferrer" className="shrink-0">
                                    <img src={card.imageUrl} alt={`${player.username} ${group.name} card`} className="w-20 border border-border" />
                                </a>
                                <div className="flex flex-col gap-0.5 text-xs">
                                    <span className="text-foreground">{group.name}</span>
                                    <span className="font-mono tabular-nums text-muted-foreground">OVR {card.ovr} · {formatDate(card.generatedAt)}</span>
                                    <a href={card.imageUrl} target="_blank" rel="noreferrer" className={LINK}>Open PNG</a>
                                </div>
                            </div>
                        ) : (
                            <span className="text-xs text-muted-foreground">No {group.name} card yet</span>
                        )}
                        {otherCards.map(c => (
                            <div key={c.groupId} className="flex items-baseline gap-3 text-xs">
                                <span className="text-foreground">{groups.find(g => g.id === c.groupId)?.name ?? 'Unknown group'}</span>
                                <span className="font-mono tabular-nums text-muted-foreground">OVR {c.ovr} · {formatDate(c.generatedAt)}</span>
                                <a href={c.imageUrl} target="_blank" rel="noreferrer" className={LINK}>Open</a>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    )
}
