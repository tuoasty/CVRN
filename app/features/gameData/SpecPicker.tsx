"use client"

import { useMemo, useState, type ReactNode } from 'react'
import { Input } from '@/app/components/ui/input'
import { InlineSwitch } from '@/app/components/filters/InlineSwitch'
import { POSITIONS, positionShortLabel, type PositionCode } from '@/shared/volleyball/positions'
import { formatHeight } from '@/shared/utils/height'
import { SPEC_STARS, type LinkSpec, type SpecLinkDecision, type SpecLinkItem, type SpecStars } from '@/server/domains/gameData/types/specLinks'
import { cn } from '@/lib/utils'

const SEARCH_LIMIT = 8
const STAR_OPTIONS = SPEC_STARS.map(s => ({ value: String(s) as `${SpecStars}`, label: String(s) }))
const POSITION_OPTIONS = POSITIONS.map(p => ({ value: p.code, label: p.shortLabel }))

function Choice({ selected, onClick, children }: { selected: boolean; onClick: () => void; children: ReactNode }) {
    return (
        <button
            type="button"
            aria-pressed={selected}
            onClick={onClick}
            className={cn(
                'px-1 py-0.5 text-left text-sm transition-colors duration-150 motion-reduce:transition-none',
                'focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50',
                selected
                    ? 'font-semibold text-foreground underline decoration-2 underline-offset-[6px]'
                    : 'font-medium text-muted-foreground hover:text-foreground',
            )}
        >
            {children}
        </button>
    )
}

function SpecLabel({ spec, takenBy }: { spec: Pick<LinkSpec, 'name' | 'stars' | 'position' | 'height'>; takenBy?: string }) {
    return (
        <>
            {spec.name}{' '}
            <span className="font-mono text-xs font-normal tabular-nums text-muted-foreground">
                {spec.stars}★ {positionShortLabel(spec.position)} {formatHeight(spec.height)}
            </span>
            {takenBy && <span className="text-xs font-normal text-secondary"> chosen for {takenBy}</span>}
        </>
    )
}

interface SpecPickerProps {
    item: SpecLinkItem
    linkable: LinkSpec[]
    value: SpecLinkDecision | undefined
    onChange: (decision: SpecLinkDecision | undefined) => void
    claims?: ReadonlyMap<string, string>
}

export default function SpecPicker({ item, linkable, value, onChange, claims }: SpecPickerProps) {
    const takenBy = (specId: string) => {
        const owner = claims?.get(specId)
        return owner && owner !== item.gameKey ? owner : undefined
    }
    const [query, setQuery] = useState('')
    const [creating, setCreating] = useState(value?.action === 'create')
    const [draftStars, setDraftStars] = useState<SpecStars | null>(value?.action === 'create' ? value.stars : null)
    const [draftPosition, setDraftPosition] = useState<PositionCode | null>(value?.action === 'create' ? value.position : null)

    const q = query.trim().toLowerCase()
    const found = useMemo(
        () => (q ? linkable.filter(s => s.name.toLowerCase().includes(q)).slice(0, SEARCH_LIMIT) : []),
        [linkable, q],
    )
    const candidateIds = new Set(item.candidates.map(c => c.specId))
    const linkedId = value?.action === 'link' ? value.specId : null
    const linked = linkedId ? linkable.find(s => s.id === linkedId) : undefined

    function link(specId: string) {
        setCreating(false)
        onChange({ gameKey: item.gameKey, action: 'link', specId, rename: false })
    }

    function startCreate() {
        setCreating(true)
        if (draftStars && draftPosition) onChange({ gameKey: item.gameKey, action: 'create', stars: draftStars, position: draftPosition })
        else onChange(undefined)
    }

    function updateDraft(stars: SpecStars | null, position: PositionCode | null) {
        setDraftStars(stars)
        setDraftPosition(position)
        if (stars && position) onChange({ gameKey: item.gameKey, action: 'create', stars, position })
    }

    return (
        <div className="space-y-2">
            {item.candidates.length > 0 && (
                <div className="flex flex-wrap items-baseline gap-x-4 gap-y-1">
                    <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Closest</span>
                    {item.candidates.map(c => (
                        <Choice key={c.specId} selected={linkedId === c.specId} onClick={() => link(c.specId)}>
                            <SpecLabel spec={c} takenBy={takenBy(c.specId)} />
                        </Choice>
                    ))}
                </div>
            )}

            <div className="flex flex-wrap items-center gap-x-4 gap-y-1">
                <Input
                    value={query}
                    onChange={e => setQuery(e.target.value)}
                    placeholder="Search every spec"
                    aria-label={`Search specs for ${item.gameName}`}
                    className="h-8 max-w-xs rounded-sm"
                />
                <Choice selected={creating} onClick={startCreate}>Create new</Choice>
                <Choice selected={value?.action === 'leave'} onClick={() => { setCreating(false); onChange({ gameKey: item.gameKey, action: 'leave' }) }}>
                    Leave unlinked
                </Choice>
                <Choice selected={value?.action === 'skip'} onClick={() => { setCreating(false); onChange({ gameKey: item.gameKey, action: 'skip' }) }}>
                    Skip
                </Choice>
            </div>
            {value?.action === 'leave' && <p className="text-xs text-muted-foreground">Shown in Information without requirements. Asked again on the next import.</p>}
            {value?.action === 'skip' && <p className="text-xs text-muted-foreground">Hidden from Information and never linked to requirements. Remembered across imports, restore it from Skipped.</p>}

            {found.length > 0 && (
                <div className="flex flex-wrap items-baseline gap-x-4 gap-y-1">
                    {found.filter(s => !candidateIds.has(s.id)).map(s => (
                        <Choice key={s.id} selected={linkedId === s.id} onClick={() => link(s.id)}>
                            <SpecLabel spec={s} takenBy={takenBy(s.id)} />
                        </Choice>
                    ))}
                </div>
            )}
            {q && found.length === 0 && <p className="text-sm text-muted-foreground">No spec matches “{query.trim()}”.</p>}

            {value?.action === 'link' && linked && linked.name !== item.gameName && (
                <label className="flex items-center gap-2 text-sm text-muted-foreground">
                    <input
                        type="checkbox"
                        checked={value.rename}
                        onChange={e => onChange({ ...value, rename: e.target.checked })}
                        className="h-3.5 w-3.5 accent-primary"
                    />
                    Rename {linked.name} to {item.gameName}
                </label>
            )}

            {creating && (
                <div className="flex flex-wrap items-center gap-x-6 gap-y-1 text-sm">
                    <span className="text-muted-foreground">New spec {item.gameName}, {formatHeight(item.height)}</span>
                    <span className="flex items-center gap-1">
                        <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Stars</span>
                        <InlineSwitch
                            label="Stars"
                            options={STAR_OPTIONS}
                            value={(draftStars ? String(draftStars) : '') as `${SpecStars}`}
                            onChange={v => updateDraft(Number(v) as SpecStars, draftPosition)}
                        />
                    </span>
                    <span className="flex items-center gap-1">
                        <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Position</span>
                        <InlineSwitch
                            label="Position"
                            options={POSITION_OPTIONS}
                            value={(draftPosition ?? '') as PositionCode}
                            onChange={v => updateDraft(draftStars, v)}
                        />
                    </span>
                </div>
            )}
        </div>
    )
}
