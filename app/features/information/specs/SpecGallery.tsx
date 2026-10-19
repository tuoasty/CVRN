"use client"

import { InlineSwitch } from '@/app/components/filters/InlineSwitch'
import { POSITIONS, normalizePositionInput, type PositionCode } from '@/shared/volleyball/positions'
import type { PublicSpecCard } from '@/server/domains/spec'
import { useInfoParams } from '../useInfoParams'
import SpecCard from './SpecCard'

export type SpecGalleries = Record<PositionCode, { active: PublicSpecCard[]; vaulted: PublicSpecCard[] }>

const OPTIONS = POSITIONS.map(p => ({ value: p.code, label: p.shortLabel }))
const GRID = 'grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-5 md:grid-cols-4 lg:grid-cols-6'

export default function SpecGallery({ galleries }: { galleries: SpecGalleries }) {
    const params = useInfoParams()
    const position = normalizePositionInput(params.get('pos') ?? '') ?? 'OUT'
    const gallery = galleries[position] ?? { active: [], vaulted: [] }

    return (
        <div>
            <InlineSwitch
                label="Position"
                options={OPTIONS}
                value={position}
                onChange={next => params.set({ pos: next === 'OUT' ? null : next.toLowerCase() })}
                className="-ml-2 mb-9 flex-wrap"
            />

            {gallery.active.length === 0 && gallery.vaulted.length === 0 ? (
                <p className="py-16 text-center text-sm text-muted-foreground">No specs</p>
            ) : (
                <>
                    <div className={GRID}>
                        {gallery.active.map(spec => <SpecCard key={spec.id} spec={spec} />)}
                    </div>
                    {gallery.vaulted.length > 0 && (
                        <section>
                            <h2 className="mb-3 mt-11 text-xs font-semibold uppercase tracking-[0.05em] text-muted-foreground">Vaulted</h2>
                            <div className={GRID}>
                                {gallery.vaulted.map(spec => <SpecCard key={spec.id} spec={spec} dimmed />)}
                            </div>
                        </section>
                    )}
                </>
            )}
        </div>
    )
}
