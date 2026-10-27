"use client"

import { useParams } from 'next/navigation'
import type { PublicSpecCard } from '@/server/domains/spec'
import Filmstrip from './Filmstrip'
import { galleryKeyOf } from './galleryKey'

interface Props {
    cards: PublicSpecCard[]
    galleries: Record<string, PublicSpecCard[]>
}

export default function SpecRail({ cards, galleries }: Props) {
    const { slug } = useParams<{ slug: string }>()
    const card = cards.find(c => c.slug === slug?.toLowerCase())
    if (!card) return null

    const group = galleryKeyOf(card)
    return <Filmstrip group={group} specs={galleries[group] ?? []} currentId={card.id} />
}
