import type { Metadata } from 'next'
import { getCachedPublicSpecs } from '@/server/cache/publicReads'
import { galleryFor, withSpecSlugs } from '@/server/domains/spec'
import { POSITIONS } from '@/shared/volleyball/positions'
import SpecGallery, { type SpecGalleries } from '@/app/features/information/specs/SpecGallery'

export const metadata: Metadata = {
    title: 'Specs',
    description: 'Every spec by position, with its kit and requirements.',
}

type PageProps = {
    searchParams: Promise<Record<string, string | string[] | undefined>>
}

export default async function SpecsPage({ searchParams }: PageProps) {
    const [rows] = await Promise.all([getCachedPublicSpecs(), searchParams])
    const cards = withSpecSlugs(rows ?? [])
    const galleries = Object.fromEntries(POSITIONS.map(p => [p.code, galleryFor(cards, p.code)])) as SpecGalleries

    return <SpecGallery galleries={galleries} />
}
