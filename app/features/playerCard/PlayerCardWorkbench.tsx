'use client'

import { useMemo, useState } from 'react'
import { generatePlayerCardAction } from '@/app/actions/playerCard.actions'
import type { CardGroup, CardOverrides } from '@/server/domains/playerCard'
import type { OverallDisplayRow } from '@/app/features/overall/overallRows'
import CardOverridesForm, { hasOverrides } from './CardOverridesForm'
import CardWorkbenchShell, { type LayoutDrafts } from './CardWorkbenchShell'

export type { LayoutDrafts }

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
    const [overrides, setOverrides] = useState<CardOverrides>({})
    const cleaned = useMemo(() => cleanOverrides(overrides), [overrides])

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
                    <span className="font-mono text-xs tabular-nums text-muted-foreground">
                        OVR {player.ovr}{player.position ? ` · ${player.position}` : ''}{player.teamName ? ` · ${player.teamName}` : ''}
                    </span>
                </>
            )}
            form={(
                <CardOverridesForm
                    overrides={overrides}
                    onChange={setOverrides}
                    computed={{ username: player.username, ovr: player.ovr, position: player.position, attributes: player.attributes }}
                />
            )}
            effectiveOvr={cleaned.ovr ?? player.ovr}
            tierNote={cleaned.ovr !== undefined ? `from overridden OVR ${cleaned.ovr}` : undefined}
            inputProblem={null}
            generateNote={hasOverrides(cleaned) ? 'With overrides' : undefined}
            buildPreview={(templateId, layers) => ({
                kind: 'board',
                playerId: player.playerId,
                seasonNumber,
                templateId,
                layers,
                overrides: cleaned,
            })}
            generate={() => generatePlayerCardAction({
                playerId: player.playerId,
                seasonNumber,
                groupId: group.id,
                overrides: cleaned,
            })}
            onGenerated={() => setOverrides({})}
        />
    )
}
