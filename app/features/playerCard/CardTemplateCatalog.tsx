'use client'

import type { CardGroup, CardTemplateSummary } from '@/server/domains/playerCard'

function tierRanges(templates: CardTemplateSummary[]) {
    return templates.map((t, i) => {
        const max = i === 0 ? 99 : templates[i - 1].minOvr - 1
        return { template: t, label: max <= t.minOvr ? `${t.minOvr}` : max === 99 ? `${t.minOvr}+` : `${t.minOvr}–${max}` }
    })
}

function floorsOutOfOrder(templates: CardTemplateSummary[]) {
    return templates.some((t, i) => i > 0 && t.minOvr >= templates[i - 1].minOvr)
}

function TierTile({ template, range }: { template: CardTemplateSummary; range: string }) {
    return (
        <figure className="flex w-28 shrink-0 flex-col gap-1.5">
            <div
                className="relative w-full overflow-hidden border border-border bg-muted"
                style={{ aspectRatio: `${template.width} / ${template.height}` }}
            >
                {template.previewUrl && (
                    <img src={template.previewUrl} alt="" className="absolute inset-0 h-full w-full object-cover" />
                )}
            </div>
            <figcaption className="flex flex-col">
                <span className="font-mono text-xs tabular-nums text-foreground">T{template.tier} · {range}</span>
                <span className="truncate text-xs text-muted-foreground" title={template.name}>{template.name}</span>
                {template.problem && <span className="text-xs text-destructive" title={template.problem}>Invalid layers</span>}
            </figcaption>
        </figure>
    )
}

export default function CardTemplateCatalog({ groups }: { groups: CardGroup[] }) {
    if (groups.length === 0) {
        return (
            <p className="py-6 text-sm text-muted-foreground">
                No card groups yet. Insert a <span className="font-mono">card_groups</span> row, then its tiers into{' '}
                <span className="font-mono">card_templates</span>.
            </p>
        )
    }

    return (
        <div className="divide-y divide-border border-y border-border">
            {groups.map(group => (
                <div key={group.id} className="flex flex-col gap-3 py-4 sm:flex-row sm:gap-6">
                    <div className="flex w-48 shrink-0 flex-col gap-0.5">
                        <span className="text-sm font-semibold text-foreground">{group.name}</span>
                        <span className="font-mono text-xs text-muted-foreground">card-templates/{group.slug}/</span>
                        <span className="text-xs text-muted-foreground">
                            {[group.isLimited && 'Limited', !group.isActive && 'Inactive', `${group.templates.length} tier${group.templates.length === 1 ? '' : 's'}`]
                                .filter(Boolean)
                                .join(' · ')}
                        </span>
                        {floorsOutOfOrder(group.templates) && (
                            <span className="text-xs text-destructive">Tier 1 should have the highest OVR floor</span>
                        )}
                    </div>
                    {group.templates.length === 0 ? (
                        <p className="text-sm text-muted-foreground">No tiers inserted.</p>
                    ) : (
                        <div className="flex gap-4 overflow-x-auto pb-1">
                            {tierRanges(group.templates).map(({ template, label }) => (
                                <TierTile key={template.id} template={template} range={label} />
                            ))}
                        </div>
                    )}
                </div>
            ))}
        </div>
    )
}
