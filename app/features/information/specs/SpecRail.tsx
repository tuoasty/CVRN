"use client"

import { useParams } from 'next/navigation'
import type { PublicSpecCard } from '@/server/domains/spec'
import { isPositionCode } from '@/shared/volleyball/positions'
import Filmstrip from './Filmstrip'

interface Props {
    cards: PublicSpecCard[]
    galleries: Record<string, PublicSpecCard[]>
}

export default function SpecRail({ cards, galleries }: Props) {
    const { slug } = useParams<{ slug: string }>()
    const card = cards.find(c => c.slug === slug?.toLowerCase())
    if (!card) return null

    const position = card.position && isPositionCode(card.position) ? card.position : 'OUT'
    return <Filmstrip position={position} specs={galleries[position] ?? []} currentId={card.id} />
}
