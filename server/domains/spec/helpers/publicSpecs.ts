import type { Season } from '@/shared/types/db'
import type { PublicSpecRow } from '@/server/db/specs.repo'
import { normalizePositionInput, type PositionCode } from '@/shared/volleyball/positions'
import { REGION_ORDER } from '@/shared/volleyball/regions'
import { toSlug } from '@/server/domains/gameData/helpers/public/slug'
import { isSeasonActive } from '@/server/domains/season/helpers/isSeasonActive'
import type { PublishedSpecRegion } from '../types/publicSnapshot'

export type PublicSpecCard = PublicSpecRow & { slug: string }

export function withSpecSlugs(rows: PublicSpecRow[]): PublicSpecCard[] {
    const taken = new Set(rows.map(r => toSlug(r.name) || 'spec'))
    const used = new Set<string>()
    const slugById = new Map<string, string>()

    const byAge = [...rows].sort((a, b) => a.created_at.localeCompare(b.created_at))
    for (const spec of byAge) {
        const base = toSlug(spec.name) || 'spec'
        let slug = base
        for (let n = 2; used.has(slug) || (slug !== base && taken.has(slug)); n++) slug = `${base}-${n}`
        used.add(slug)
        slugById.set(spec.id, slug)
    }

    return rows.map(spec => ({ ...spec, slug: slugById.get(spec.id) ?? toSlug(spec.name) }))
}

export function withLoadouts(cards: PublicSpecCard[], kits: Record<string, unknown> | undefined): PublicSpecCard[] {
    return cards.filter(c => c.game_key !== null && kits?.[c.game_key] !== undefined)
}

function byStarsThenName(a: PublicSpecCard, b: PublicSpecCard): number {
    return (b.stars ?? 0) - (a.stars ?? 0) || a.name.localeCompare(b.name)
}

export function galleryFor(cards: PublicSpecCard[], position: PositionCode): { active: PublicSpecCard[]; vaulted: PublicSpecCard[] } {
    const inPosition = cards.filter(c => c.position === position)
    return {
        active: inPosition.filter(c => !c.is_vaulted).sort(byStarsThenName),
        vaulted: inPosition.filter(c => c.is_vaulted).sort(byStarsThenName),
    }
}

export function parseGalleryPosition(raw: string | undefined): PositionCode {
    return normalizePositionInput(raw ?? '') ?? 'OUT'
}

function regionRank(code: string): number {
    const i = (REGION_ORDER as readonly string[]).indexOf(code.toUpperCase())
    return i === -1 ? REGION_ORDER.length : i
}

export function pickRequirementRegion(p: { published: PublishedSpecRegion[]; query?: string; cookie?: string }): PublishedSpecRegion | null {
    const ordered = [...p.published].sort((a, b) => regionRank(a.code) - regionRank(b.code))
    const find = (code: string | undefined) => (code ? ordered.find(r => r.code.toUpperCase() === code.trim().toUpperCase()) : undefined)
    return find(p.query) ?? find(p.cookie?.split(':')[0]) ?? find('NA') ?? ordered[0] ?? null
}

export function seasonForRegion(regionId: string, seasons: Season[]): Season | null {
    const own = seasons
        .filter(s => s.region_id === regionId)
        .sort((a, b) => b.start_date.localeCompare(a.start_date))
    return own.find(isSeasonActive) ?? own[0] ?? null
}
