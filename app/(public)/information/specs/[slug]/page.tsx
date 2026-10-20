import type { Metadata } from 'next'
import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import {
    getCachedPublicInformation,
    getCachedPublicSpecSnapshot,
    getCachedPublicSpecs,
    getCachedPublishedSpecRegions,
    getCachedRecentSpecWinners,
    getCachedRegions,
    getCachedSeasons,
} from '@/server/cache/publicReads'
import { galleryFor, heightRangeFor, pickRequirementRegion, seasonForRegion, winnersForSpec, withLoadouts, withSpecSlugs } from '@/server/domains/spec'
import type { InspectorData } from '@/server/domains/gameData'
import { REGION_ORDER } from '@/shared/volleyball/regions'
import { formatHeight } from '@/shared/utils/height'
import { isPositionCode, positionShortLabel } from '@/shared/volleyball/positions'
import SpecPhoto from '@/app/features/spec/SpecPhoto'
import Filmstrip from '@/app/features/information/specs/Filmstrip'
import Stars from '@/app/features/information/specs/Stars'
import SpecKit from '@/app/features/information/specs/SpecKit'
import RequirementsColumn, { type RequirementRegion } from '@/app/features/information/specs/RequirementsColumn'
import SpecWinners, { type WinnerColumn } from '@/app/features/information/specs/SpecWinners'

const WINNER_REGIONS = ['AS', 'EU', 'NA'] as const

type PageProps = {
    params: Promise<{ slug: string }>
    searchParams: Promise<Record<string, string | string[] | undefined>>
}

async function findCard(slug: string) {
    const [rows, info] = await Promise.all([getCachedPublicSpecs(), getCachedPublicInformation()])
    const cards = withLoadouts(withSpecSlugs(rows ?? []), info.kits)
    return { cards, info, card: cards.find(c => c.slug === slug.toLowerCase()) ?? null }
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
    const { slug } = await params
    const { card } = await findCard(slug)
    return { title: card?.name ?? 'Specs' }
}

function regionRank(code: string): number {
    const i = (REGION_ORDER as readonly string[]).indexOf(code.toUpperCase())
    return i === -1 ? REGION_ORDER.length : i
}

function Fact({ label, value }: { label: string; value: string }) {
    return (
        <div>
            <span className="mb-0.5 block text-xs font-semibold uppercase tracking-[0.05em] text-muted-foreground">{label}</span>
            <span className="font-mono text-sm tabular-nums text-foreground">{value}</span>
        </div>
    )
}

export default async function SpecPage({ params, searchParams }: PageProps) {
    const [{ slug }, sp] = await Promise.all([params, searchParams])
    const { cards, info, card } = await findCard(slug)
    if (!card) redirect('/information/specs')

    const [published, seasons, recent, allRegions, cookieStore] = await Promise.all([
        getCachedPublishedSpecRegions(),
        getCachedSeasons(),
        getCachedRecentSpecWinners(),
        getCachedRegions(),
        cookies(),
    ])
    const ordered = [...(published ?? [])].sort((a, b) => regionRank(a.code) - regionRank(b.code))
    const snapshots = await Promise.all(ordered.map(r => getCachedPublicSpecSnapshot(r.regionId)))
    const winners = winnersForSpec(recent ?? { seasonsByRegion: {}, winners: [] }, card.id)

    const regions: RequirementRegion[] = ordered.map((r, i) => {
        const snapshot = snapshots[i]
        const season = seasonForRegion(r.regionId, seasons ?? [])
        return {
            code: r.code.toUpperCase(),
            regionId: r.regionId,
            season: season ? { name: season.name, slug: season.slug } : null,
            requirement: snapshot?.specs?.find(s => s.id === card.id) ?? null,
            setsFloor: snapshot?.setsFloorByStar?.[card.stars] ?? 10,
            bonus: snapshot?.placementBonus ?? null,
            heightRange: heightRangeFor(snapshot?.heightRangeByStar, card.stars),
        }
    })
    const winnerColumns: WinnerColumn[] = WINNER_REGIONS.map(code => {
        const region = (allRegions ?? []).find(r => r.code.toUpperCase() === code)
        return { code, seasons: region ? winners[region.id] ?? [] : [] }
    })
    const query = typeof sp.region === 'string' ? sp.region : undefined
    const initial = pickRequirementRegion({ published: ordered, query, cookie: cookieStore.get('cvrn_last_ctx')?.value })

    const position = isPositionCode(card.position) ? card.position : 'OUT'
    const gallery = galleryFor(cards, position)
    const kit = card.game_key ? info.kits?.[card.game_key] : undefined
    const allInspectors = info.inspectors ?? {}
    const inspectors: Record<string, InspectorData> = {}
    for (const entry of [...(kit?.active ?? []), ...(kit?.passive ?? [])]) {
        if (entry.target && allInspectors[entry.target]) inspectors[entry.target] = allInspectors[entry.target]
    }

    return (
        <div className="grid grid-cols-[minmax(0,1fr)] gap-10 min-[900px]:grid-cols-[230px_minmax(0,1fr)] min-[1200px]:grid-cols-[230px_minmax(0,1fr)_330px]">
            <Filmstrip position={position} specs={[...gallery.active, ...gallery.vaulted]} currentId={card.id} />

            <div className="min-w-0">
                <div className="spec-hero mb-7">
                    <div className="spec-hero-grid">
                        <SpecPhoto url={card.photo_url} name={card.name} sizes="190px" />
                        <div className="min-w-0">
                            <Stars stars={card.stars} className="text-base tracking-[2px]" />
                            <h1 className="text-balance text-2xl font-semibold tracking-[-0.025em] text-foreground">{card.name}</h1>
                            <p className="text-sm text-muted-foreground">
                                {positionShortLabel(position)}
                                {card.is_vaulted && <span className="ml-2">Vaulted</span>}
                            </p>
                            <div className="mt-3.5 flex flex-wrap gap-x-8 gap-y-3">
                                <Fact label="Height" value={formatHeight(card.height)} />
                                {kit && <Fact label="Cooldown" value={`${kit.cooldown}s`} />}
                                {kit?.lifetime !== undefined && <Fact label="Lasts" value={`${kit.lifetime}s`} />}
                            </div>
                        </div>
                    </div>
                </div>
                {kit && <SpecKit kit={kit} inspectors={inspectors} />}
                <SpecWinners columns={winnerColumns} />
            </div>

            <div className="min-[900px]:col-start-2 min-[1200px]:col-start-auto">
                <RequirementsColumn regions={regions} initial={initial?.code.toUpperCase() ?? regions[0]?.code ?? ''} vaulted={card.is_vaulted} />
            </div>
        </div>
    )
}
