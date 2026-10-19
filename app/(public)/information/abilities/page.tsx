import type { Metadata } from 'next'
import { getCachedPublicInformation } from '@/server/cache/publicReads'
import type { InspectorData } from '@/server/domains/gameData'
import AbilitiesView from '@/app/features/information/abilities/AbilitiesView'

export const metadata: Metadata = {
    title: 'Abilities',
    description: 'Every rollable ability with its rarity and odds.',
}

type PageProps = {
    searchParams: Promise<Record<string, string | string[] | undefined>>
}

export default async function AbilitiesPage({ searchParams }: PageProps) {
    const [info] = await Promise.all([getCachedPublicInformation(), searchParams])
    const catalog = { physical: info.abilities?.physical ?? [], technical: info.abilities?.technical ?? [] }
    const all = info.inspectors ?? {}

    const inspectors: Record<string, InspectorData> = {}
    for (const group of [...catalog.physical, ...catalog.technical]) {
        for (const ability of group.abilities ?? []) {
            for (const line of ability.lines ?? []) {
                if (line.grants && all[line.grants]) inspectors[line.grants] = all[line.grants]
            }
        }
    }

    return <AbilitiesView catalog={catalog} heights={info.heights ?? []} inspectors={inspectors} />
}
