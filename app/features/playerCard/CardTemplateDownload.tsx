'use client'

import { useState } from 'react'
import { downloadCardTierTemplateAction } from '@/app/actions/playerCard.actions'
import { toast } from '@/app/utils/toast'
import type { CardGroup } from '@/server/domains/playerCard'
import { tierHasArt } from './cardArt'
import { FIELD_LABEL, LINK } from './cardFormStyles'
import { saveDataUri } from './saveDataUri'

export default function CardTemplateDownload({ group, onClose }: { group: CardGroup; onClose: () => void }) {
    const [busyId, setBusyId] = useState<string | null>(null)

    async function download(templateId: string, tierName: string) {
        setBusyId(templateId)
        try {
            const result = await downloadCardTierTemplateAction({ templateId })
            if (!result.ok) {
                toast.error(`${tierName} template not downloaded`, result.error.message)
                return
            }
            saveDataUri(result.value.dataUri, result.value.fileName)
        } catch {
            toast.error(`${tierName} template not downloaded`, 'The connection dropped. Try again.')
        } finally {
            setBusyId(null)
        }
    }

    return (
        <div className="flex flex-col gap-2">
            <div className="flex items-baseline gap-3">
                <span className={FIELD_LABEL}>Download template</span>
                <button type="button" className={LINK} onClick={onClose}>Close</button>
            </div>
            <p className="text-xs text-muted-foreground">
                The tier&apos;s art at <span className="font-mono tabular-nums">{group.width} × {group.height}</span>, stretched the same way as generated cards.
            </p>
            {group.templates.length === 0 ? (
                <p className="text-xs text-muted-foreground">{group.name} has no tiers yet.</p>
            ) : (
                <div className="flex flex-wrap items-baseline gap-x-4 gap-y-1">
                    {group.templates.map(template => {
                        const hasArt = tierHasArt(group.layers ?? [], template.art)
                        const busy = busyId === template.id
                        return (
                            <button
                                key={template.id}
                                type="button"
                                className={LINK}
                                disabled={!hasArt || busyId !== null}
                                aria-busy={busy}
                                onClick={() => void download(template.id, template.name)}
                            >
                                T{template.rank} {template.name}{!hasArt ? ' · No art' : busy ? ' · Preparing...' : ''}
                            </button>
                        )
                    })}
                </div>
            )}
        </div>
    )
}
