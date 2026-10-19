import type { Metadata } from 'next'
import { getCachedPublicInformation } from '@/server/cache/publicReads'
import type { InspectorData, PublicBuildCatalog } from '@/server/domains/gameData'
import BuildsView from '@/app/features/information/builds/BuildsView'

export const metadata: Metadata = {
    title: 'Builds',
    description: 'Every build with its physical, technical, height range and effect.',
}

type PageProps = {
    searchParams: Promise<Record<string, string | string[] | undefined>>
}

export default async function BuildsPage({ searchParams }: PageProps) {
    const [info] = await Promise.all([getCachedPublicInformation(), searchParams])
    const builds = info.builds
    const catalog: PublicBuildCatalog = {
        groups: builds?.groups ?? [],
        physicals: builds?.physicals ?? [],
        technicals: builds?.technicals ?? [],
        heights: builds?.heights ?? [],
    }
    const all = info.inspectors ?? {}

    const inspectors: Record<string, InspectorData> = {}
    for (const group of catalog.groups) {
        for (const build of group.builds ?? []) {
            for (const effect of build.effects ?? []) {
                if (effect.kind !== 'text' && effect.target && all[effect.target]) inspectors[effect.target] = all[effect.target]
            }
        }
    }

    return <BuildsView catalog={catalog} inspectors={inspectors} />
}
