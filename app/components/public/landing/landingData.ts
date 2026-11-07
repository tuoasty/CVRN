import type {Region, Season} from "@/shared/types/db";
import {REPRESENTATIVES, type RepresentativeRegion} from "./representatives";

export interface RegionTarget {
    href: string;
    seasonNumber: number | null;
}

export interface ContinueLink {
    href: string;
    label: string;
}

export type RegionTargets = Record<RepresentativeRegion, RegionTarget>;

export function pickRegionTargets(
    regions: Pick<Region, "id" | "code">[],
    seasons: Pick<Season, "region_id" | "slug" | "name" | "start_date" | "end_date" | "season_number">[],
    now: Date,
): RegionTargets {
    const targets = {} as RegionTargets;
    for (const rep of REPRESENTATIVES) {
        const region = regions.find(r => r.code.toLowerCase() === rep.region);
        const regionSeasons = region
            ? seasons
                .filter(s => s.region_id === region.id)
                .sort((a, b) => b.start_date.localeCompare(a.start_date))
            : [];
        const target = regionSeasons.find(s => !s.end_date || new Date(s.end_date) > now) ?? regionSeasons[0];
        targets[rep.region] = target
            ? {href: `/${rep.region}/${target.slug}`, seasonNumber: target.season_number}
            : {href: "/select", seasonNumber: null};
    }
    return targets;
}

export function resolveContinue(
    cookieValue: string | undefined,
    regions: Pick<Region, "id" | "code" | "name">[],
    seasons: Pick<Season, "region_id" | "slug" | "name">[],
): ContinueLink | null {
    if (!cookieValue) return null;
    const colon = cookieValue.indexOf(":");
    if (colon <= 0) return null;
    const code = cookieValue.slice(0, colon).toLowerCase();
    const slug = cookieValue.slice(colon + 1);
    if (!slug) return null;

    const region = regions.find(r => r.code.toLowerCase() === code);
    if (!region) return null;
    const season = seasons.find(s => s.region_id === region.id && s.slug === slug);
    if (!season) return null;

    const name = REPRESENTATIVES.find(r => r.region === code)?.name ?? region.name;
    return {href: `/${code}/${season.slug}`, label: `${name} ${season.name}`};
}

export function headerSeasonNumber(targets: RegionTargets, focused: RepresentativeRegion | null): number | null {
    const own = focused ? targets[focused].seasonNumber : null;
    if (own !== null) return own;
    const numbers = Object.values(targets)
        .map(t => t.seasonNumber)
        .filter((n): n is number => n !== null);
    return numbers.length ? Math.max(...numbers) : null;
}
