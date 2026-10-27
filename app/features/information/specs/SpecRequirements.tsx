"use client"

import { useParams, useSearchParams } from 'next/navigation'
import { heightRangeFor } from '@/server/domains/spec/helpers/heightRange'
import type { PublicSpecCard, SpecSnapshotPayload } from '@/server/domains/spec'
import RequirementsColumn, { type RequirementRegion } from './RequirementsColumn'

export interface SnapshotRegion {
    code: string
    regionId: string
    season: { name: string; slug: string } | null
    snapshot: SpecSnapshotPayload | null
}

interface Props {
    cards: PublicSpecCard[]
    regions: SnapshotRegion[]
    fallback: string
}

export default function SpecRequirements({ cards, regions, fallback }: Props) {
    const { slug } = useParams<{ slug: string }>()
    const query = useSearchParams().get('region')?.toUpperCase()
    const card = cards.find(c => c.slug === slug?.toLowerCase())
    if (!card || card.stars === null) return null
    const stars = card.stars

    const forCard: RequirementRegion[] = regions.map(r => ({
        code: r.code,
        regionId: r.regionId,
        season: r.season,
        requirement: r.snapshot?.specs?.find(s => s.id === card.id) ?? null,
        setsFloor: r.snapshot?.setsFloorByStar?.[stars] ?? 10,
        bonus: r.snapshot?.placementBonus ?? null,
        heightRange: heightRangeFor(r.snapshot?.heightRangeByStar, stars),
    }))
    const initial = query && regions.some(r => r.code === query) ? query : fallback

    return <RequirementsColumn regions={forCard} initial={initial} vaulted={card.is_vaulted} />
}
