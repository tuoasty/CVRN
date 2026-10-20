import { Suspense } from 'react'
import { cookies } from 'next/headers'
import {
    getCachedPublicInformation,
    getCachedPublicSpecSnapshot,
    getCachedPublicSpecs,
    getCachedPublishedSpecRegions,
    getCachedSeasons,
} from '@/server/cache/publicReads'
import { galleryFor, pickRequirementRegion, seasonForRegion, withLoadouts, withSpecSlugs } from '@/server/domains/spec'
import { REGION_ORDER } from '@/shared/volleyball/regions'
import { POSITIONS } from '@/shared/volleyball/positions'
import SpecRail from '@/app/features/information/specs/SpecRail'
import SpecRequirements, { type SnapshotRegion } from '@/app/features/information/specs/SpecRequirements'

function regionRank(code: string): number {
    const i = (REGION_ORDER as readonly string[]).indexOf(code.toUpperCase())
    return i === -1 ? REGION_ORDER.length : i
}

async function loadCards() {
    const [rows, info] = await Promise.all([getCachedPublicSpecs(), getCachedPublicInformation()])
    return withLoadouts(withSpecSlugs(rows ?? []), info.kits)
}

function Block({ className }: { className: string }) {
    return <div className={`animate-pulse bg-muted/40 motion-reduce:animate-none ${className}`} />
}

function RailSkeleton() {
    return (
        <div className="hidden space-y-2 min-[900px]:block">
            <Block className="mb-3.5 h-4 w-24" />
            {[...Array(8)].map((_, i) => <Block key={i} className="h-12 w-full" />)}
        </div>
    )
}

function RequirementsSkeleton() {
    return (
        <div className="space-y-2">
            <Block className="h-9 w-full" />
            {[...Array(6)].map((_, i) => <Block key={i} className="h-5 w-full" />)}
        </div>
    )
}

async function RailSlot() {
    const cards = await loadCards()
    const galleries = Object.fromEntries(POSITIONS.map(p => {
        const gallery = galleryFor(cards, p.code)
        return [p.code, [...gallery.active, ...gallery.vaulted]]
    }))
    return <SpecRail cards={cards} galleries={galleries} />
}

async function RequirementsSlot() {
    const [cards, published, seasons, cookieStore] = await Promise.all([
        loadCards(),
        getCachedPublishedSpecRegions(),
        getCachedSeasons(),
        cookies(),
    ])
    const ordered = [...(published ?? [])].sort((a, b) => regionRank(a.code) - regionRank(b.code))
    const snapshots = await Promise.all(ordered.map(r => getCachedPublicSpecSnapshot(r.regionId)))

    const regions: SnapshotRegion[] = ordered.map((r, i) => {
        const season = seasonForRegion(r.regionId, seasons ?? [])
        return {
            code: r.code.toUpperCase(),
            regionId: r.regionId,
            season: season ? { name: season.name, slug: season.slug } : null,
            snapshot: snapshots[i] ?? null,
        }
    })
    const initial = pickRequirementRegion({ published: ordered, cookie: cookieStore.get('cvrn_last_ctx')?.value })

    return <SpecRequirements cards={cards} regions={regions} fallback={initial?.code.toUpperCase() ?? regions[0]?.code ?? ''} />
}

export default function SpecDetailLayout({ children }: { children: React.ReactNode }) {
    return (
        <div className="grid grid-cols-[minmax(0,1fr)] gap-10 min-[900px]:grid-cols-[230px_minmax(0,1fr)] min-[1200px]:grid-cols-[230px_minmax(0,1fr)_330px]">
            <Suspense fallback={<RailSkeleton />}>
                <RailSlot />
            </Suspense>

            <div className="min-w-0">{children}</div>

            <div className="min-[900px]:col-start-2 min-[1200px]:col-start-auto">
                <Suspense fallback={<RequirementsSkeleton />}>
                    <RequirementsSlot />
                </Suspense>
            </div>
        </div>
    )
}
