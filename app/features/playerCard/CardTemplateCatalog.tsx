'use client'

import { useState } from 'react'
import type { CardGroup, CardTemplateSummary } from '@/server/domains/playerCard'
import { cn } from '@/lib/utils'
import CardGroupForm from './CardGroupForm'
import CardTierForm from './CardTierForm'
import { LINK } from './cardFormStyles'

type Tray =
    | { kind: 'newGroup' }
    | { kind: 'group'; groupId: string }
    | { kind: 'newTier'; groupId: string }
    | { kind: 'tier'; groupId: string; templateId: string }
    | null

function tierRanges(templates: CardTemplateSummary[]) {
    return templates.map((t, i) => {
        const max = i === 0 ? 99 : templates[i - 1].minOvr - 1
        return { template: t, label: max <= t.minOvr ? `${t.minOvr}` : max === 99 ? `${t.minOvr}+` : `${t.minOvr}–${max}` }
    })
}

function TierTile({ group, template, range, selected, onSelect }: {
    group: CardGroup
    template: CardTemplateSummary
    range: string
    selected: boolean
    onSelect: () => void
}) {
    return (
        <button
            type="button"
            onClick={onSelect}
            aria-pressed={selected}
            className="flex w-28 shrink-0 flex-col gap-1.5 rounded-sm text-left focus:outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50"
        >
            <div
                className="relative w-full overflow-hidden border border-border bg-muted transition-shadow duration-150 hover:shadow-md"
                style={{ aspectRatio: `${group.width} / ${group.height}` }}
            >
                {template.previewUrl && (
                    <img src={template.previewUrl} alt="" className="absolute inset-0 h-full w-full object-cover" />
                )}
            </div>
            <span className="flex flex-col">
                <span className={cn('self-start font-mono text-xs tabular-nums text-foreground', selected && 'font-semibold shadow-[inset_0_-2px_0_currentColor]')}>
                    T{template.rank} · {range}
                </span>
                <span className="truncate text-xs text-muted-foreground" title={template.name}>{template.name}</span>
                {!template.previewUrl && <span className="text-xs text-muted-foreground">No art found</span>}
            </span>
        </button>
    )
}

export default function CardTemplateCatalog({ groups }: { groups: CardGroup[] }) {
    const [tray, setTray] = useState<Tray>(null)
    const close = () => setTray(null)
    const nextSortOrder = groups.reduce((max, g) => Math.max(max, g.sortOrder), 0) + 1

    const trayFor = (group: CardGroup) => {
        if (!tray || tray.kind === 'newGroup' || tray.groupId !== group.id) return null
        if (tray.kind === 'group') {
            return <CardGroupForm key={group.id} group={group} groups={groups} nextSortOrder={nextSortOrder} onDone={close} onCancel={close} />
        }
        const template = tray.kind === 'tier' ? group.templates.find(t => t.id === tray.templateId) ?? null : null
        if (tray.kind === 'tier' && !template) return null
        return (
            <CardTierForm
                key={template?.id ?? `new-${group.id}`}
                group={group}
                template={template}
                onSaved={templateId => setTray({ kind: 'tier', groupId: group.id, templateId })}
                onDeleted={close}
                onCancel={close}
            />
        )
    }

    return (
        <div className="flex flex-col gap-3">
            <div>
                <button type="button" className={LINK} onClick={() => setTray({ kind: 'newGroup' })}>New group</button>
            </div>

            {tray?.kind === 'newGroup' && (
                <div className="border-t border-border pt-4">
                    <CardGroupForm group={null} groups={groups} nextSortOrder={nextSortOrder} onDone={close} onCancel={close} />
                </div>
            )}

            {groups.length === 0 ? (
                <p className="py-6 text-sm text-muted-foreground">No card groups yet.</p>
            ) : (
                <div className="divide-y divide-border border-y border-border">
                    {groups.map(group => {
                        const open = trayFor(group)
                        return (
                            <div key={group.id} className="flex flex-col gap-4 py-4">
                                <div className="flex flex-col gap-3 sm:flex-row sm:gap-6">
                                    <div className="flex w-48 shrink-0 flex-col items-start gap-0.5">
                                        <span className="text-sm font-semibold text-foreground">{group.name}</span>
                                        <span className="text-xs text-muted-foreground">
                                            {[!group.isActive && 'Inactive', `${group.templates.length} tier${group.templates.length === 1 ? '' : 's'}`]
                                                .filter(Boolean)
                                                .join(' · ')}
                                        </span>
                                        <span className="font-mono text-xs tabular-nums text-muted-foreground">{group.width} × {group.height}</span>
                                        {group.problem && <span className="text-xs text-destructive">{group.problem}</span>}
                                        {group.layersProblem
                                            ? <span className="text-xs text-destructive" title={group.layersProblem}>Invalid layout</span>
                                            : group.layers?.length === 0 && <span className="text-xs text-muted-foreground">No layout yet</span>}
                                        <button type="button" className={cn(LINK, 'mt-1')} onClick={() => setTray({ kind: 'group', groupId: group.id })}>
                                            Edit group
                                        </button>
                                    </div>
                                    <div className="flex items-start gap-4 overflow-x-auto pb-1">
                                        {tierRanges(group.templates).map(({ template, label }) => (
                                            <TierTile
                                                key={template.id}
                                                group={group}
                                                template={template}
                                                range={label}
                                                selected={tray?.kind === 'tier' && tray.templateId === template.id}
                                                onSelect={() => setTray({ kind: 'tier', groupId: group.id, templateId: template.id })}
                                            />
                                        ))}
                                        <button
                                            type="button"
                                            className={cn(LINK, 'shrink-0 whitespace-nowrap', tray?.kind === 'newTier' && tray.groupId === group.id && 'font-semibold')}
                                            onClick={() => setTray({ kind: 'newTier', groupId: group.id })}
                                        >
                                            Add tier
                                        </button>
                                    </div>
                                </div>
                                {open && <div className="border-t border-border/60 pt-4 sm:pl-[13.5rem]">{open}</div>}
                            </div>
                        )
                    })}
                </div>
            )}
        </div>
    )
}
