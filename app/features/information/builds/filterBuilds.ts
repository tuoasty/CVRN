import type { PublicBuild, PublicBuildCatalog } from '@/server/domains/gameData'

export interface BuildFilters {
    physical?: string
    technical?: string
    height?: number
    q?: string
}

function matches(build: PublicBuild, f: BuildFilters): boolean {
    if (f.q && !build.name.toLowerCase().includes(f.q.trim().toLowerCase())) return false
    return build.combos.some(combo =>
        (!f.physical || combo.physicalSlug === f.physical) &&
        (!f.technical || combo.technicalSlug === f.technical) &&
        (f.height === undefined || (combo.minInches <= f.height && f.height <= combo.maxInches)),
    )
}

export function filterBuilds(catalog: PublicBuildCatalog, f: BuildFilters): { groups: PublicBuildCatalog['groups']; exact: string | null } {
    const groups = (catalog.groups ?? [])
        .map(group => ({ ...group, builds: group.builds.filter(build => matches(build, f)) }))
        .filter(group => group.builds.length > 0)

    const all = groups.flatMap(g => g.builds)
    const complete = !!f.physical && !!f.technical && f.height !== undefined
    return { groups, exact: complete && all.length === 1 ? all[0].slug : null }
}

export function parseBuildFilters(params: URLSearchParams, catalog: PublicBuildCatalog): BuildFilters {
    const filters: BuildFilters = {}
    const physical = params.get('physical')
    const technical = params.get('technical')
    const height = Number(params.get('height'))
    if (physical && (catalog.physicals ?? []).some(o => o.slug === physical)) filters.physical = physical
    if (technical && (catalog.technicals ?? []).some(o => o.slug === technical)) filters.technical = technical
    if (Number.isInteger(height) && (catalog.heights ?? []).some(h => h.inches === height)) filters.height = height
    return filters
}
