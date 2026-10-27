import type { Metadata } from 'next'
import { redirect } from 'next/navigation'
import { cn } from '@/lib/utils'
import { getCachedPublicInformation, getCachedPublicSpecs, getCachedRecentSpecWinners, getCachedRegions } from '@/server/cache/publicReads'
import { winnersForSpec, withLoadouts, withSpecSlugs } from '@/server/domains/spec'
import type { InspectorData } from '@/server/domains/gameData'
import { formatHeight } from '@/shared/utils/height'
import { isPositionCode, positionShortLabel } from '@/shared/volleyball/positions'
import SpecPhoto from '@/app/features/spec/SpecPhoto'
import Stars from '@/app/features/information/specs/Stars'
import SpecKit, { SpecSplit } from '@/app/features/information/specs/SpecKit'
import SpecWinners, { type WinnerColumn } from '@/app/features/information/specs/SpecWinners'

const WINNER_REGIONS = ['AS', 'EU', 'NA'] as const

type PageProps = {
    params: Promise<{ slug: string }>
}

async function findCard(slug: string) {
    const [rows, info] = await Promise.all([getCachedPublicSpecs(), getCachedPublicInformation()])
    const cards = withLoadouts(withSpecSlugs(rows ?? []), info.kits)
    return { info, card: cards.find(c => c.slug === slug.toLowerCase()) ?? null }
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
    const { slug } = await params
    const { card } = await findCard(slug)
    return { title: card?.name ?? 'Specs' }
}

function Fact({ label, value }: { label: string; value: string }) {
    return (
        <div>
            <span className="mb-0.5 block text-xs font-semibold uppercase tracking-[0.05em] text-muted-foreground">{label}</span>
            <span className="font-mono text-sm tabular-nums text-foreground">{value}</span>
        </div>
    )
}

export default async function SpecPage({ params }: PageProps) {
    const { slug } = await params
    const { info, card } = await findCard(slug)
    if (!card) redirect('/information/specs')

    const kit = card.game_key ? info.kits?.[card.game_key] : undefined
    const allInspectors = info.inspectors ?? {}
    const inspectors: Record<string, InspectorData> = {}
    for (const entry of [...(kit?.active ?? []), ...(kit?.passive ?? [])]) {
        if (entry.target && allInspectors[entry.target]) inspectors[entry.target] = allInspectors[entry.target]
    }

    const position = card.position && isPositionCode(card.position) ? card.position : 'OUT'
    const hero = (
        <div className={card.is_custom ? 'spec-hero' : 'spec-hero mb-7'}>
            <div className={cn('spec-hero-grid', card.is_custom && 'min-[1200px]:grid-cols-[minmax(0,1fr)] min-[1200px]:gap-y-5')}>
                <SpecPhoto url={card.photo_url} name={card.name} sizes={card.is_custom ? '(min-width:1200px) 360px, 190px' : '190px'} />
                <div className="min-w-0">
                    {card.stars !== null && <Stars stars={card.stars} className="text-base tracking-[2px]" />}
                    <h1 className="text-balance text-2xl font-semibold tracking-[-0.025em] text-foreground">{card.name}</h1>
                    <p className="text-sm text-muted-foreground">
                        {card.is_custom ? 'Custom' : positionShortLabel(position)}
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
    )

    if (card.is_custom) return kit ? <SpecKit kit={kit} inspectors={inspectors} header={hero} split /> : <SpecSplit header={hero} list={null} />

    const [recent, allRegions] = await Promise.all([getCachedRecentSpecWinners(), getCachedRegions()])
    const winners = winnersForSpec(recent ?? { seasonsByRegion: {}, winners: [] }, card.id)
    const winnerColumns: WinnerColumn[] = WINNER_REGIONS.map(code => {
        const region = (allRegions ?? []).find(r => r.code.toUpperCase() === code)
        return { code, seasons: region ? winners[region.id] ?? [] : [] }
    })

    return (
        <>
            {hero}
            {kit && <SpecKit kit={kit} inspectors={inspectors} />}
            <SpecWinners columns={winnerColumns} />
        </>
    )
}
