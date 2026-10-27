"use client"

import { useCallback } from 'react'
import { usePathname, useRouter, useSearchParams } from 'next/navigation'

export const REGION_ALL = 'all'

export function useOverallParams(seasonNumbers: number[], regionCodes: string[]) {
    const router = useRouter()
    const pathname = usePathname()
    const searchParams = useSearchParams()

    const rawSeason = Number(searchParams.get('season'))
    const rawRegion = (searchParams.get('region') ?? REGION_ALL).toLowerCase()

    const latest = seasonNumbers.length > 0 ? Math.max(...seasonNumbers) : null
    const seasonNumber = seasonNumbers.includes(rawSeason) ? rawSeason : latest
    const region = regionCodes.some(c => c.toLowerCase() === rawRegion) ? rawRegion : REGION_ALL

    const write = useCallback((season: number | null, nextRegion: string) => {
        const params = new URLSearchParams()
        if (season !== null && season !== latest) params.set('season', String(season))
        if (nextRegion !== REGION_ALL) params.set('region', nextRegion)
        const query = params.toString()
        router.replace(query ? `${pathname}?${query}` : pathname, { scroll: false })
    }, [latest, pathname, router])

    const setSeason = useCallback((season: number) => write(season, region), [write, region])
    const setRegion = useCallback((next: string) => write(seasonNumber, next.toLowerCase()), [write, seasonNumber])

    return { seasonNumber, region, setSeason, setRegion }
}
