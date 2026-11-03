'use client'

import { useMemo, useState } from 'react'
import { Input } from '@/app/components/ui/input'
import { downloadCustomPlayerCardTemplateAction, generateCustomPlayerCardAction } from '@/app/actions/playerCard.actions'
import { uploadPlayerCardGfx } from '@/app/hooks/usePlayerCard'
import { CARD_STAT_FIELDS, CARD_STAT_LABELS } from '@/server/domains/playerCard/types/schemas'
import type { CardGroup, CustomCardValues, PlayerCard } from '@/server/domains/playerCard'
import type { CategoryRatings } from '@/server/domains/overall'
import { Err } from '@/shared/types/result'
import { RatingInput } from './CardOverridesForm'
import CardWorkbenchShell, { type LayoutDrafts } from './CardWorkbenchShell'
import { FIELD_LABEL, LINK } from './cardFormStyles'
import type { CustomPlayerChoice } from './CustomPlayerPicker'

interface CustomDraft {
    ovr?: number
    position: string
    attributes: Partial<CategoryRatings>
}

const EMPTY_DRAFT: CustomDraft = { position: '', attributes: {} }

function toValues(draft: CustomDraft): CustomCardValues | null {
    if (draft.ovr === undefined) return null
    if (CARD_STAT_FIELDS.some(field => draft.attributes[field] === undefined)) return null
    return { ovr: draft.ovr, position: draft.position, attributes: draft.attributes as CategoryRatings }
}

export default function CustomCardWorkbench({
    player,
    seasonNumber,
    regionCode,
    group,
    groups,
    drafts,
    onDraftsChange,
    onGenerated,
}: {
    player: CustomPlayerChoice
    seasonNumber: number
    regionCode: string | null
    group: CardGroup
    groups: CardGroup[]
    drafts: LayoutDrafts
    onDraftsChange: (drafts: LayoutDrafts) => void
    onGenerated: (card: PlayerCard) => void
}) {
    const [draft, setDraft] = useState<CustomDraft>(EMPTY_DRAFT)
    const values = useMemo(() => toValues(draft), [draft])
    const identity = {
        robloxUserId: player.robloxUserId,
        username: player.username,
        displayName: player.displayName,
        avatarUrl: player.avatarUrl,
    }

    return (
        <CardWorkbenchShell
            playerId={player.playerId}
            username={player.username}
            seasonNumber={seasonNumber}
            group={group}
            groups={groups}
            drafts={drafts}
            onDraftsChange={onDraftsChange}
            heading={(
                <>
                    <span className="text-base font-semibold text-foreground">{player.username}</span>
                    <span className="text-xs text-muted-foreground">
                        {player.playerId ? 'Custom card' : 'Custom card · Generate or Upload GFX adds this player to the league database'}
                    </span>
                </>
            )}
            form={(
                <div className="flex flex-col gap-3">
                    <div className="flex items-baseline gap-3">
                        <span className={FIELD_LABEL}>Card values</span>
                        <button type="button" className={LINK} onClick={() => setDraft(EMPTY_DRAFT)}>Clear</button>
                    </div>
                    <div className="flex flex-wrap items-end gap-x-4 gap-y-3">
                        <RatingInput label="OVR" value={draft.ovr} onChange={ovr => setDraft(d => ({ ...d, ovr }))} />
                        <label className="flex flex-col gap-1">
                            <span className={FIELD_LABEL}>Position</span>
                            <Input
                                value={draft.position}
                                maxLength={3}
                                aria-label="Position, up to 3 characters"
                                onChange={e => setDraft(d => ({ ...d, position: e.target.value }))}
                                className="h-8 w-16 rounded-sm font-mono text-sm"
                            />
                        </label>
                    </div>
                    <div className="flex flex-wrap items-end gap-x-3 gap-y-3">
                        {CARD_STAT_FIELDS.map(field => (
                            <RatingInput
                                key={field}
                                label={CARD_STAT_LABELS[field]}
                                value={draft.attributes[field]}
                                onChange={value => setDraft(d => ({ ...d, attributes: { ...d.attributes, [field]: value } }))}
                            />
                        ))}
                    </div>
                    <p className="text-xs text-muted-foreground">
                        OVR and all 6 attributes are required. Position can be any 3 characters, or empty. The team comes from their roster this season, or stays empty. With no team, Season uses the selected region.
                    </p>
                </div>
            )}
            effectiveOvr={draft.ovr ?? null}
            inputProblem={values ? null : 'Enter the OVR and all 6 attributes'}
            buildPreview={(templateId, layers, previewOvr) => values && {
                kind: 'custom',
                player: identity,
                seasonNumber,
                regionCode,
                templateId,
                layers,
                values: previewOvr === null ? values : { ...values, ovr: previewOvr },
            }}
            generate={() => generateCustomPlayerCardAction({
                player: identity,
                seasonNumber,
                regionCode,
                groupId: group.id,
                values,
            })}
            downloadTemplate={() => downloadCustomPlayerCardTemplateAction({
                player: identity,
                seasonNumber,
                regionCode,
                groupId: group.id,
                values,
            })}
            uploadGfx={file => values
                ? uploadPlayerCardGfx({ kind: 'custom', player: identity, seasonNumber, regionCode, groupId: group.id, values }, file)
                : Promise.resolve(Err({ message: 'Enter the OVR and all 6 attributes', code: 'VALIDATION_ERROR' }))}
            onGenerated={card => {
                setDraft(EMPTY_DRAFT)
                onGenerated(card)
            }}
        />
    )
}
