"use client"

import { InlineSwitch } from '@/app/components/filters/InlineSwitch'
import { POSITIONS } from '@/shared/volleyball/positions'
import type { PublicSpecCard } from '@/server/domains/spec'
import { useInfoParams } from '../useInfoParams'
import SpecCard from './SpecCard'
import { CUSTOM_GALLERY, parseGalleryKey, type GalleryKey } from './galleryKey'

export type SpecGalleries = Record<GalleryKey, { active: PublicSpecCard[]; vaulted: PublicSpecCard[] }>

const OPTIONS: { value: GalleryKey; label: string }[] = POSITIONS.map(p => ({ value: p.code, label: p.shortLabel }))
const CUSTOM_OPTIONS: { value: GalleryKey; label: string }[] = [{ value: CUSTOM_GALLERY, label: 'Custom' }]
const GRID = 'grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-5 md:grid-cols-4 lg:grid-cols-6'

export default function SpecGallery({ galleries }: { galleries: SpecGalleries }) {
    const params = useInfoParams()
    const key = parseGalleryKey(params.get('pos'))
    const gallery = galleries[key] ?? { active: [], vaulted: [] }
    const select = (next: GalleryKey) => params.set({ pos: next === 'OUT' ? null : next.toLowerCase() })

    return (
        <div>
            <div className="-ml-2 mb-9 flex flex-wrap items-center gap-x-6 gap-y-2">
                <InlineSwitch label="Position" options={OPTIONS} value={key} onChange={select} className="flex-wrap" />
                <InlineSwitch label="Custom specs" options={CUSTOM_OPTIONS} value={key} onChange={select} className="ml-auto" />
            </div>

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
