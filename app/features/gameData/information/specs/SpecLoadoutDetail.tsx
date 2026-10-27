"use client"

import Link from 'next/link'
import { useMemo, type ReactNode } from 'react'
import { InlineSwitch } from '@/app/components/filters/InlineSwitch'
import { REGION_ORDER } from '@/app/features/leaderboard/useLeaderboardFilters'
import { POSITIONS, type PositionCode } from '@/shared/volleyball/positions'
import { formatGameHeight, formatHeight } from '@/shared/utils/height'
import { resolveKit, resolveTuning } from '@/server/domains/gameData/helpers/specLoadouts/resolveKit'
import { kitSections, requirementStatus, specPopLine } from '@/server/domains/gameData/helpers/specLoadouts/loadoutView'
import type { SpecLoadout } from '@/server/domains/gameData/types/datasets'
import { SPEC_STARS, type SpecStars } from '@/server/domains/gameData/types/specLinks'
import { useInformation } from '../InformationProvider'
import { useUserRole } from '@/app/admin/AdminRoleProvider'
import KitSection from './KitSection'
import SpecPhotoControl from './SpecPhotoControl'

const STAR_OPTIONS = SPEC_STARS.map(s => ({ value: String(s) as `${SpecStars}`, label: String(s) }))
const POSITION_OPTIONS = POSITIONS.map(p => ({ value: p.code, label: p.shortLabel }))
const IMPORT_HREF = '/admin/game-data/import'
const LINK = 'font-medium text-primary underline-offset-4 hover:underline'

function Fact({ label, children }: { label: string; children: ReactNode }) {
    return (
        <>
            <dt className="text-xs font-semibold uppercase tracking-[0.05em] text-muted-foreground">{label}</dt>
            <dd className="min-w-0">{children}</dd>
        </>
    )
}

export default function SpecLoadoutDetail({ loadout }: { loadout: SpecLoadout }) {
    const { specByGameKey, skipped, regions, kitResolver, abilityByKey, saveSpecFacts } = useInformation()
    const role = useUserRole()
    const canImport = role === 'admin' || role === 'super_admin'
    const showRequirements = role !== 'information_manager'
    const canPhoto = role === 'admin' || role === 'super_admin' || role === 'information_manager'
    const spec = specByGameKey.get(loadout.key)
    const kit = useMemo(() => resolveKit(loadout, kitResolver), [loadout, kitResolver])
    const tunes = useMemo(() => resolveTuning(loadout, kit, abilityByKey), [loadout, kit, abilityByKey])
    const sections = useMemo(() => kitSections(kit), [kit])
    const requirements = spec ? requirementStatus(spec.requirements.map(r => r.region_id), regions, REGION_ORDER) : []

    return (
        <div className="pb-10">
            <h2 className="text-xl font-semibold tracking-tight text-foreground">
                {spec ? spec.name : loadout.name}
                {spec?.is_vaulted && <span className="ml-2.5 text-sm font-medium tracking-normal text-muted-foreground">vaulted</span>}
                {spec?.is_custom && <span className="ml-2.5 text-sm font-medium tracking-normal text-muted-foreground">custom</span>}
            </h2>
            <p className="mt-0.5 text-xs text-muted-foreground">
                Game key <span className="font-mono">&ldquo;{loadout.key}&rdquo;</span>
                {!spec && (skipped.has(loadout.key)
                    ? <> · skipped{canImport && <> · <Link href={IMPORT_HREF} className={LINK}>Restore on Import ›</Link></>}</>
                    : <> · not linked{canImport && <> · <Link href={IMPORT_HREF} className={LINK}>Link on Import ›</Link></>}</>)}
            </p>

            <dl className="mt-5 grid grid-cols-[120px_1fr] items-baseline gap-x-4 gap-y-2.5 text-sm">
                {spec && (
                    <>
                        {canPhoto && (
                            <Fact label="Photo">
                                <SpecPhotoControl spec={spec} />
                            </Fact>
                        )}
                        {!spec.is_custom && (
                            <>
                                <Fact label="Stars">
                                    <InlineSwitch
                                        label="Stars"
                                        className="-ml-2"
                                        options={STAR_OPTIONS}
                                        value={String(spec.stars) as `${SpecStars}`}
                                        onChange={v => void saveSpecFacts(spec.id, { stars: Number(v) as SpecStars })}
                                    />
                                </Fact>
                                <Fact label="Position">
                                    <InlineSwitch
                                        label="Position"
                                        className="-ml-2"
                                        options={POSITION_OPTIONS}
                                        value={spec.position as PositionCode}
                                        onChange={v => void saveSpecFacts(spec.id, { position: v })}
                                    />
                                </Fact>
                            </>
                        )}
                    </>
                )}
                <Fact label="Height">
                    <span className="font-mono tabular-nums">{spec ? formatHeight(spec.height) : formatGameHeight(loadout.height)}</span>
                </Fact>
                {spec && !spec.is_custom && showRequirements && (
                    <Fact label="Requirements">
                        <span className="grid grid-cols-[repeat(4,76px)_auto] items-baseline">
                            {requirements.map(r => (
                                <span key={r.code}>
                                    <span className="mr-1.5 font-mono text-xs font-semibold">{r.code}</span>
                                    <span className={r.set ? 'text-muted-foreground' : 'text-secondary'}>{r.set ? 'set' : 'missing'}</span>
                                </span>
                            ))}
                            <Link href="/admin/specs" className={LINK}>Edit on Specs ›</Link>
                        </span>
                    </Fact>
                )}
                <Fact label="Spec pop">
                    <span className="font-mono text-xs tabular-nums">{specPopLine(loadout)}</span>
                </Fact>
            </dl>

            <KitSection title="Active" hint="on spec pop" entries={sections.active} tunes={tunes} />
            <KitSection title="Passive" entries={sections.passive} tunes={tunes} />
            {sections.text.length > 0 && (
                <section className="mt-8">
                    <h3 className="flex items-baseline gap-2 border-b border-border pb-2 text-sm font-semibold text-foreground">
                        Plain text in the kit
                        <span className="font-mono text-xs font-normal tabular-nums text-muted-foreground">{sections.text.length}</span>
                    </h3>
                    <ul className="mt-1">
                        {sections.text.map((entry, i) => (
                            <li key={`${entry.slot}-${entry.name}-${i}`} className="grid grid-cols-[70px_1fr] items-baseline gap-x-3 py-1 text-sm">
                                <span className="text-xs text-muted-foreground">{entry.slot}</span>
                                <span className="text-foreground">{entry.name}</span>
                            </li>
                        ))}
                    </ul>
                </section>
            )}
        </div>
    )
}
