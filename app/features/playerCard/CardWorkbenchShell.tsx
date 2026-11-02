'use client'

import { ReactNode, useState } from 'react'
import { Button } from '@/app/components/ui/button'
import { saveCardGroupLayers, storePlayerCard, useCardPreview, usePlayerCards } from '@/app/hooks/usePlayerCard'
import type { CardPreviewRequest } from '@/app/hooks/usePlayerCard'
import { toast } from '@/app/utils/toast'
import { pickTierTemplate } from '@/server/domains/playerCard/helpers/toCardShapes'
import type { CardGroup, CardLayer, PlayerCard } from '@/server/domains/playerCard'
import type { Result } from '@/shared/types/result'
import CardLayoutEditor from './CardLayoutEditor'
import CardLayoutPreview from './CardLayoutPreview'
import { layerProblem } from './cardSegments'

const LINK = 'text-xs text-primary hover:underline underline-offset-4 rounded-sm focus:outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50 disabled:opacity-40 disabled:no-underline'
const SECTION = 'text-xs font-semibold uppercase tracking-wider text-muted-foreground'

export type LayoutDrafts = Record<string, CardLayer[]>

function formatDate(iso: string) {
    return new Date(iso).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' })
}

export default function CardWorkbenchShell({
    playerId,
    username,
    seasonNumber,
    group,
    groups,
    drafts,
    onDraftsChange,
    heading,
    form,
    effectiveOvr,
    tierNote,
    inputProblem,
    generateNote,
    buildPreview,
    generate,
    onGenerated,
}: {
    playerId: string | null
    username: string
    seasonNumber: number
    group: CardGroup
    groups: CardGroup[]
    drafts: LayoutDrafts
    onDraftsChange: (drafts: LayoutDrafts) => void
    heading: ReactNode
    form: ReactNode
    effectiveOvr: number | null
    tierNote?: string
    inputProblem: string | null
    generateNote?: string
    buildPreview: (templateId: string, layers: CardLayer[]) => CardPreviewRequest | null
    generate: () => Promise<Result<PlayerCard>>
    onGenerated: (card: PlayerCard) => void
}) {
    const { cards } = usePlayerCards(playerId, seasonNumber)
    const [activeIndex, setActiveIndex] = useState<number | null>(null)
    const [showBorders, setShowBorders] = useState(true)
    const [saving, setSaving] = useState(false)
    const [generating, setGenerating] = useState(false)

    const template = effectiveOvr === null ? null : pickTierTemplate(group.templates, effectiveOvr)

    const savedLayers = group.layers ?? []
    const draft = drafts[group.id]
    const layers = draft ?? savedLayers
    const dirty = draft !== undefined && JSON.stringify(draft) !== JSON.stringify(savedLayers)
    const layoutProblem = layers.length === 0 ? 'Add at least one segment' : layers.map(layerProblem).find(Boolean) ?? null

    const preview = useCardPreview(template && !layoutProblem ? buildPreview(template.id, layers) : null)

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
            const result = await generate()
            if (!result.ok) {
                toast.error('Card generation failed', result.error.message)
                return
            }
            await storePlayerCard(result.value)
            onGenerated(result.value)
            toast.success(`${group.name} card generated for ${username}`)
        } finally {
            setGenerating(false)
        }
    }

    const noTier = effectiveOvr !== null && !template ? `${group.name} has no tier for OVR ${effectiveOvr}` : null
    const generateBlocker = inputProblem
        ?? noTier
        ?? (dirty ? 'Save or discard layout changes before generating' : layoutProblem)

    return (
        <div className="flex flex-col gap-6">
            <div className="flex flex-col gap-0.5">
                {heading}
                <span className="text-xs text-muted-foreground">
                    {template
                        ? <>{group.name} T{template.rank} {template.name} art{tierNote && ` · ${tierNote}`}</>
                        : noTier
                            ? <span className="text-destructive">{noTier}</span>
                            : 'Tier follows the OVR you enter'}
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

                    {form}
                </div>

                <div className="flex w-full flex-col gap-3 xl:w-[22rem] xl:shrink-0">
                    <div className="flex items-baseline gap-3">
                        <span className={SECTION}>Preview</span>
                        <button type="button" className={LINK} onClick={() => setShowBorders(b => !b)}>
                            {showBorders ? 'Hide borders' : 'Show borders'}
                        </button>
                    </div>
                    {template && !inputProblem ? (
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
                        <div className="flex aspect-[5/7] w-full items-center justify-center border border-dashed border-border p-4 text-center">
                            <span className="text-sm text-muted-foreground">{inputProblem ?? noTier}</span>
                        </div>
                    )}

                    <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
                        <Button size="sm" className="rounded-sm" disabled={generating || !!generateBlocker} onClick={handleGenerate}>
                            {generating ? 'Generating...' : card ? 'Regenerate' : 'Generate'}
                        </Button>
                        {generateNote && <span className="text-xs text-foreground">{generateNote}</span>}
                    </div>
                    {generateBlocker && <p className="text-xs text-muted-foreground">{generateBlocker}</p>}

                    <div className="flex flex-col gap-2 border-t border-border pt-3">
                        <span className={SECTION}>Saved cards this season</span>
                        {card ? (
                            <div className="flex items-start gap-3">
                                <a href={card.imageUrl} target="_blank" rel="noreferrer" className="shrink-0">
                                    <img src={card.imageUrl} alt={`${username} ${group.name} card`} className="w-20 border border-border" />
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
