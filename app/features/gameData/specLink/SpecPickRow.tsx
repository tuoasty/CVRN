"use client"

import { useMemo, useState, type ReactNode } from 'react'
import { InlineSwitch } from '@/app/components/filters/InlineSwitch'
import { POSITIONS, type PositionCode } from '@/shared/volleyball/positions'
import { formatHeight } from '@/shared/utils/height'
import { SPEC_STARS, type LinkSpec, type SpecLinkDecision, type SpecLinkItem, type SpecStars } from '@/server/domains/gameData/types/specLinks'
import { cn } from '@/lib/utils'
import { CANDIDATE_LIMIT, SEARCH_LIMIT, SPEC_PICK_GRID } from './pickGrid'

type Option = 'search' | 'create' | 'leave' | 'skip'

interface ShownSpec {
    id: string
    name: string
    stars: number
    position: string
    height: number
}

interface SpecPickRowProps {
    item: SpecLinkItem
    mode: 'pick' | 'proposed'
    linkable: LinkSpec[]
    claims: ReadonlyMap<string, string>
    value: SpecLinkDecision | undefined
    onChange: (decision: SpecLinkDecision | undefined) => void
}

const STAR_OPTIONS = SPEC_STARS.map(s => ({ value: String(s) as `${SpecStars}`, label: String(s) }))
const POSITION_OPTIONS = POSITIONS.map(p => ({ value: p.code, label: p.code }))
const RENAME_KEEP = 'keep'
const RENAME_TO = 'rename'

function Choice({ selected, quiet = false, onClick, children }: { selected: boolean; quiet?: boolean; onClick: () => void; children: ReactNode }) {
    return (
        <button
            type="button"
            aria-pressed={selected}
            onClick={onClick}
            className={cn(
                'w-max max-w-full text-left text-sm transition-colors duration-150 motion-reduce:transition-none',
                'focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50',
                selected
                    ? 'font-semibold text-foreground underline decoration-2 underline-offset-[6px]'
                    : cn(quiet ? 'font-normal' : 'font-medium', 'text-muted-foreground hover:text-foreground'),
            )}
        >
            {children}
        </button>
    )
}

function FieldLabel({ children }: { children: ReactNode }) {
    return <span className="text-xs font-semibold uppercase tracking-[0.05em] text-muted-foreground">{children}</span>
}

export default function SpecPickRow({ item, mode, linkable, claims, value, onChange }: SpecPickRowProps) {
    const specById = useMemo(() => new Map(linkable.map(s => [s.id, s])), [linkable])
    const shown = useMemo((): ShownSpec[] => {
        if (mode === 'proposed') {
            const proposal = item.specId ? specById.get(item.specId) : undefined
            return proposal ? [proposal] : []
        }
        return item.candidates.slice(0, CANDIDATE_LIMIT).map(c => ({ id: c.specId, name: c.name, stars: c.stars, position: c.position, height: c.height }))
    }, [mode, item, specById])

    const linkedId = value?.action === 'link' ? value.specId : null
    const [open, setOpen] = useState<'search' | 'create' | null>(() => {
        if (value?.action === 'create') return 'create'
        if (linkedId !== null && !shown.some(s => s.id === linkedId)) return 'search'
        return null
    })
    const [query, setQuery] = useState('')
    const [stars, setStars] = useState<SpecStars | null>(value?.action === 'create' ? value.stars : null)
    const [position, setPosition] = useState<PositionCode | null>(value?.action === 'create' ? value.position : null)

    const q = query.trim().toLowerCase()
    const results = useMemo((): ShownSpec[] => {
        if (q) return linkable.filter(s => s.name.toLowerCase().includes(q)).slice(0, SEARCH_LIMIT)
        const linked = linkedId ? specById.get(linkedId) : undefined
        return linked ? [linked] : []
    }, [q, linkable, linkedId, specById])

    const selected: Option | null = open ?? (value?.action === 'leave' || value?.action === 'skip' ? value.action : null)
    const fallback: SpecLinkDecision | undefined = mode === 'proposed' && item.specId
        ? { gameKey: item.gameKey, action: 'link', specId: item.specId, rename: false }
        : undefined

    function reset() {
        setOpen(null)
        setQuery('')
        onChange(fallback)
    }

    function link(id: string, fromSearch: boolean) {
        if (linkedId === id) { reset(); return }
        if (!fromSearch) setOpen(null)
        onChange({ gameKey: item.gameKey, action: 'link', specId: id, rename: false })
    }

    function choose(option: Option) {
        if (selected === option) { reset(); return }
        if (option === 'search') {
            setOpen('search')
            setQuery('')
            onChange(undefined)
        } else if (option === 'create') {
            setOpen('create')
            onChange(stars && position ? { gameKey: item.gameKey, action: 'create', stars, position } : undefined)
        } else {
            setOpen(null)
            onChange({ gameKey: item.gameKey, action: option })
        }
    }

    function draft(nextStars: SpecStars | null, nextPosition: PositionCode | null) {
        setStars(nextStars)
        setPosition(nextPosition)
        onChange(nextStars && nextPosition ? { gameKey: item.gameKey, action: 'create', stars: nextStars, position: nextPosition } : undefined)
    }

    function renderSpec(spec: ShownSpec, index: number, fromSearch: boolean) {
        const isSelected = linkedId === spec.id
        const owner = claims.get(spec.id)
        return (
            <div key={spec.id} className="flex flex-col gap-1">
                <Choice selected={isSelected} quiet={index > 0} onClick={() => link(spec.id, fromSearch)}>
                    {spec.name}{' '}
                    <span className="font-mono text-xs font-normal tabular-nums text-muted-foreground">
                        {spec.stars}★ {spec.position} {formatHeight(spec.height)}
                    </span>
                </Choice>
                {owner !== undefined && owner !== item.gameKey && <span className="text-xs text-secondary">Chosen for {owner}</span>}
                {isSelected && value?.action === 'link' && spec.name !== item.gameName && (
                    <div className="flex flex-wrap items-center gap-x-1">
                        <span className="text-xs text-muted-foreground">Name</span>
                        <InlineSwitch
                            label="Name"
                            options={[{ value: RENAME_KEEP, label: 'Keep' }, { value: RENAME_TO, label: `Rename to ${item.gameName}` }]}
                            value={value.rename ? RENAME_TO : RENAME_KEEP}
                            onChange={v => onChange({ ...value, rename: v === RENAME_TO })}
                        />
                    </div>
                )}
            </div>
        )
    }

    return (
        <div className={cn(SPEC_PICK_GRID, 'items-baseline py-2.5')}>
            <div className="min-w-0">
                <p className="text-sm font-semibold text-foreground">
                    {item.gameName}
                    {value === undefined && <span aria-label="Needs a decision" className="ml-1.5 inline-block h-1.5 w-1.5 rounded-full bg-secondary align-middle" />}
                </p>
                <p className="font-mono text-xs tabular-nums text-muted-foreground">{formatHeight(item.height)} game</p>
            </div>

            <div className="flex min-w-0 flex-col gap-1.5">
                {open === 'search' ? (
                    <>
                        <input
                            autoFocus
                            value={query}
                            onChange={e => setQuery(e.target.value)}
                            placeholder="Search specs"
                            aria-label={`Search specs for ${item.gameName}`}
                            className="h-7 w-full rounded-none border-0 border-b border-border bg-transparent px-0 text-sm text-foreground placeholder:text-muted-foreground focus-visible:border-b-2 focus-visible:border-primary focus-visible:outline-none"
                        />
                        {results.map((s, i) => renderSpec(s, i, true))}
                        {q && results.length === 0 && <span className="text-sm text-muted-foreground">No spec matches “{query.trim()}”</span>}
                    </>
                ) : shown.length > 0
                    ? shown.map((s, i) => renderSpec(s, i, false))
                    : <span className="text-sm text-muted-foreground">No close name</span>}
            </div>

            <Choice selected={selected === 'search'} onClick={() => choose('search')}>Search</Choice>
            <Choice selected={selected === 'create'} onClick={() => choose('create')}>Create new</Choice>
            <Choice selected={selected === 'leave'} onClick={() => choose('leave')}>Leave unlinked</Choice>
            <Choice selected={selected === 'skip'} onClick={() => choose('skip')}>Skip</Choice>

            {open === 'create' && (
                <div className="col-span-5 col-start-2 mt-2.5 flex flex-wrap items-center gap-x-7 gap-y-1 bg-muted px-3 py-2.5">
                    <div className="flex items-center gap-1">
                        <FieldLabel>Stars</FieldLabel>
                        <InlineSwitch
                            label="Stars"
                            options={STAR_OPTIONS}
                            value={(stars ? String(stars) : '') as `${SpecStars}`}
                            onChange={v => draft(Number(v) as SpecStars, position)}
                        />
                    </div>
                    <div className="flex items-center gap-1">
                        <FieldLabel>Position</FieldLabel>
                        <InlineSwitch
                            label="Position"
                            options={POSITION_OPTIONS}
                            value={(position ?? '') as PositionCode}
                            onChange={v => draft(stars, v)}
                        />
                    </div>
                </div>
            )}
        </div>
    )
}
