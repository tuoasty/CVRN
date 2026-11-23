"use client"

import { InlineSwitch } from '@/app/components/filters/InlineSwitch'
import type { InspectorData, PublicSpecKit } from '@/server/domains/gameData'
import { useInfoParams } from '../useInfoParams'
import SpecKit from './SpecKit'
import { KIT_PARAM, pickKit, type KitChoice } from './pickKit'

const OPTIONS = [
    { value: 'league', label: 'League' },
    { value: 'custom', label: 'Custom' },
] as const satisfies readonly { value: KitChoice; label: string }[]

interface Props {
    league: PublicSpecKit | undefined
    custom: PublicSpecKit | undefined
    inspectors: Record<string, InspectorData>
}

export default function KitSwitch({ league, custom, inspectors }: Props) {
    const params = useInfoParams()
    const { kit, choice, canSwitch } = pickKit(league, custom, params.get(KIT_PARAM))

    return (
        <div>
            {canSwitch && (
                <InlineSwitch
                    label="Kit"
                    options={OPTIONS}
                    value={choice}
                    onChange={next => params.set({ [KIT_PARAM]: next === 'custom' ? 'custom' : null })}
                    className="-ml-2 mb-5"
                />
            )}
            {kit && <SpecKit key={choice} kit={kit} inspectors={inspectors} />}
        </div>
    )
}
