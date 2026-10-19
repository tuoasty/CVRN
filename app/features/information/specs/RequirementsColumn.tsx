"use client"

import { useState } from 'react'
import { cn } from '@/lib/utils'
import { formatHeight } from '@/shared/utils/height'
import { formatPlacement } from '@/app/utils/placement'
import { formatPlacementBonus, type PlacementBonusConfig } from '@/server/domains/spec/helpers/placementBonus'
import { TIER_WORD } from '@/server/domains/spec/helpers/maskRequirement'
import type { PublicRequirement, PublicSpec } from '@/server/domains/spec'
import { useInfoParams } from '../useInfoParams'

export interface RequirementRegion {
    code: string
    regionId: string
    season: { name: string; slug: string } | null
    requirement: PublicSpec | null
    setsFloor: number
    bonus: PlacementBonusConfig | null
}

interface Props {
    regions: RequirementRegion[]
    initial: string
    vaulted: boolean
}

const LABEL = 'text-xs font-semibold uppercase tracking-[0.05em] text-muted-foreground'

function bonusRows(config: PlacementBonusConfig): { label: string; bonus: number }[] {
    return [
        { label: 'Upper-bracket finalist', bonus: config.upperFinalist },
        ...config.ladder.map((bonus, i) => ({ label: formatPlacement(i + 1, 1), bonus })),
        { label: 'Outside the top 8', bonus: config.outside },
    ].filter(row => row.bonus !== 0)
}

function Group({ title, rule, lines }: { title: string; rule: string; lines: PublicRequirement[] }) {
    return (
        <div className="mt-5">
            <div className="mb-1.5 flex justify-between">
                <span className={LABEL}>{title}</span>
                <span className="text-xs text-muted-foreground">{rule}</span>
            </div>
            {lines.map(line => (
                <div key={line.statKey} className="flex items-baseline justify-between gap-3 py-[3px] text-sm">
                    <span className="text-foreground">{line.label}</span>
                    {line.tier !== null && <span className="shrink-0 font-semibold text-foreground">{TIER_WORD[line.tier]}</span>}
                </div>
            ))}
        </div>
    )
}

export default function RequirementsColumn({ regions, initial, vaulted }: Props) {
    const params = useInfoParams()
    const [selected, setSelected] = useState(initial)
    const region = regions.find(r => r.code === selected) ?? regions[0]

    const pick = (next: RequirementRegion) => {
        setSelected(next.code)
        if (next.season) {
            document.cookie = `cvrn_last_ctx=${next.code.toLowerCase()}:${next.season.slug};path=/;max-age=31536000;samesite=lax`
        }
        params.set({ region: next.code.toLowerCase() })
    }

    const spec = region?.requirement
    const extraParticipation = spec?.participation.filter(p => p.statKey !== 'sets_played') ?? []

    return (
        <section aria-labelledby="requirements-heading">
            <h2 id="requirements-heading" className="mb-3 text-sm font-semibold text-foreground">Requirements</h2>

            {vaulted ? (
                <p className="text-sm text-muted-foreground">Vaulted</p>
            ) : !region ? (
                <p className="text-sm text-muted-foreground">Not set</p>
            ) : (
                <>
                    <div role="group" aria-label="Region" className="mb-1.5 flex bg-muted/45">
                        {regions.map(r => {
                            const on = r.code === region.code
                            return (
                                <button
                                    key={r.code}
                                    type="button"
                                    aria-pressed={on}
                                    onClick={() => pick(r)}
                                    className={cn(
                                        'flex-1 py-2 text-center font-mono text-xs font-semibold transition-colors duration-150 motion-reduce:transition-none',
                                        'focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-inset focus-visible:ring-ring/50',
                                        on ? 'bg-background text-foreground shadow-[inset_0_-2px_0_hsl(var(--foreground))]' : 'text-muted-foreground hover:text-foreground',
                                    )}
                                >
                                    {r.code}
                                </button>
                            )
                        })}
                    </div>
                    {region.season && <p className="mb-5 text-xs text-muted-foreground">{region.season.name}</p>}

                    {!spec ? (
                        <p className="text-sm text-muted-foreground">Not set</p>
                    ) : (
                        <>
                            <div className="flex flex-col gap-1 text-xs text-muted-foreground">
                                <span><b className="font-mono font-medium tabular-nums text-foreground">{region.setsFloor}</b> sets played</span>
                                <span>
                                    <b className="font-mono font-medium tabular-nums text-foreground">
                                        {formatHeight(spec.heightInches - 2)} to {formatHeight(spec.heightInches + 2)}
                                    </b>{' '}
                                    height
                                </span>
                                {extraParticipation.map(p => (
                                    <span key={p.statKey}><b className="font-mono font-medium tabular-nums text-foreground">{p.value}</b> {p.label}</span>
                                ))}
                            </div>
                            {spec.main.length > 0 && <Group title="Main" rule="all required" lines={spec.main} />}
                            {spec.secondary.length > 0 && (
                                <Group title="Secondary" rule={`any ${spec.secondaryRequired} of ${spec.secondary.length}`} lines={spec.secondary} />
                            )}
                        </>
                    )}

                    {region.bonus && bonusRows(region.bonus).length > 0 && (
                        <div className="mt-6">
                            <p className={cn(LABEL, 'mb-1.5')}>Placement bonus</p>
                            {bonusRows(region.bonus).map(row => (
                                <div key={row.label} className="flex items-baseline justify-between gap-3 py-[3px] text-sm">
                                    <span className="text-foreground">{row.label}</span>
                                    <span className="font-mono text-xs font-medium tabular-nums text-foreground">{formatPlacementBonus(row.bonus)}</span>
                                </div>
                            ))}
                        </div>
                    )}
                </>
            )}

        </section>
    )
}
