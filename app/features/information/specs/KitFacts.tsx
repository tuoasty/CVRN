"use client"

import type { PublicSpecKit } from '@/server/domains/gameData'
import { useInfoParams } from '../useInfoParams'
import Fact from './Fact'
import { KIT_PARAM, pickKit } from './pickKit'

interface Props {
    league: PublicSpecKit | undefined
    custom: PublicSpecKit | undefined
}

export function StaticKitFacts({ kit }: { kit: PublicSpecKit | undefined }) {
    if (!kit) return null
    return (
        <>
            <Fact label="Cooldown" value={`${kit.cooldown}s`} />
            {kit.lifetime !== undefined && <Fact label="Lasts" value={`${kit.lifetime}s`} />}
        </>
    )
}

export default function KitFacts({ league, custom }: Props) {
    const params = useInfoParams()
    const { kit } = pickKit(league, custom, params.get(KIT_PARAM))
    return <StaticKitFacts kit={kit} />
}
