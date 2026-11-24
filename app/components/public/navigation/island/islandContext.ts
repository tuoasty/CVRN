import type {Region, Season} from "@/shared/types/db";

export const ISLAND_REGION_CODES = ["AS", "EU", "NA"] as const;

export type IslandRegionCode = (typeof ISLAND_REGION_CODES)[number];

export const FOLDED_REGIONS: Record<string, IslandRegionCode> = {SA: "NA"};

export type IslandRegion = Pick<Region, "id" | "code" | "name">;

export type IslandSeason = Pick<Season, "id" | "slug" | "name" | "region_id" | "start_date" | "end_date" | "season_number">;

export type IslandSeasonGroup = {regionCode: string; regionName: string; seasons: IslandSeason[]};

export function islandRegionFor(code: string | undefined): IslandRegionCode | null {
    if (!code) return null;
    const upper = code.toUpperCase();
    if ((ISLAND_REGION_CODES as readonly string[]).includes(upper)) return upper as IslandRegionCode;
    return FOLDED_REGIONS[upper] ?? null;
}

export function sortSeasonsNewestFirst(seasons: IslandSeason[]): IslandSeason[] {
    return [...seasons].sort((a, b) => {
        if (a.start_date !== b.start_date) return a.start_date < b.start_date ? 1 : -1;
        return b.season_number - a.season_number;
    });
}

function groupFor(code: string, regions: IslandRegion[], seasons: IslandSeason[]): IslandSeasonGroup | null {
    const region = regions.find(r => r.code.toUpperCase() === code);
    if (!region) return null;
    const own = seasons.filter(s => s.region_id === region.id);
    if (own.length === 0) return null;
    return {regionCode: code, regionName: region.name, seasons: sortSeasonsNewestFirst(own)};
}

export function seasonGroupsFor(island: IslandRegionCode, regions: IslandRegion[], seasons: IslandSeason[]): IslandSeasonGroup[] {
    const folded = Object.keys(FOLDED_REGIONS).filter(code => FOLDED_REGIONS[code] === island);
    return [island, ...folded]
        .map(code => groupFor(code, regions, seasons))
        .filter((group): group is IslandSeasonGroup => group !== null);
}


export function contextHref(
    regionCode: string,
    seasonSlug: string,
    pathname: string,
    current: {region: string; season: string} | null,
): string {
    const target = `/${regionCode.toLowerCase()}/${seasonSlug}`;
    if (!current) return target;
    const base = `/${current.region}/${current.season}/`;
    const section = pathname.startsWith(base) ? pathname.slice(base.length).split("/")[0] : "";
    return section ? `${target}/${section}` : target;
}

export function isPlainLeftClick(event: {button: number; metaKey: boolean; ctrlKey: boolean; shiftKey: boolean; altKey: boolean}): boolean {
    return event.button === 0 && !event.metaKey && !event.ctrlKey && !event.shiftKey && !event.altKey;
}

export function seasonForRegionSwitch(
    island: IslandRegionCode,
    regions: IslandRegion[],
    seasons: IslandSeason[],
    seasonNumber: number | null,
): IslandSeason | null {
    const own = groupFor(island, regions, seasons)?.seasons ?? [];
    return own.find(season => season.season_number === seasonNumber) ?? own[0] ?? null;
}
