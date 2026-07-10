"use client";

import { useCallback, useEffect, useMemo } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Region } from "@/shared/types/db";
import { SeasonWithPlayoffConfig } from "@/server/domains/season";
import {
    DEFAULT_TEAMS_FILTERS,
    isSpecificSeason,
    REGION_ALL,
    SEASON_ACTIVE,
    SEASON_INACTIVE,
    TeamsFilters,
} from "./selectTeams";

/** Serializes filters to a query string, omitting defaults so the clean state is a bare path. */
export function buildTeamsQuery(filters: TeamsFilters): string {
    const params = new URLSearchParams();
    if (filters.region !== DEFAULT_TEAMS_FILTERS.region) params.set("region", filters.region);
    if (filters.season !== DEFAULT_TEAMS_FILTERS.season) params.set("season", filters.season);
    if (filters.q.trim()) params.set("q", filters.q.trim());
    return params.toString();
}

function seasonsForRegionCode(
    seasons: SeasonWithPlayoffConfig[],
    regions: Region[],
    regionCode: string
): SeasonWithPlayoffConfig[] {
    const region = regions.find((r) => r.code.toLowerCase() === regionCode);
    if (!region) return [];
    return seasons.filter((s) => s.region_id === region.id);
}

/**
 * Repairs untrusted URL input. Returns the filters unchanged when they are already valid,
 * so the caller can skip a needless `router.replace`.
 */
function normalize(
    raw: TeamsFilters,
    regions: Region[],
    seasons: SeasonWithPlayoffConfig[]
): TeamsFilters {
    let region = raw.region;
    let season = raw.season;

    const isKnownRegion =
        region === REGION_ALL || regions.some((r) => r.code.toLowerCase() === region);
    if (!isKnownRegion) region = REGION_ALL;

    if (isSpecificSeason(season)) {
        // A season slug is only meaningful inside one region: slugs are unique per-region only.
        if (region === REGION_ALL) {
            season = SEASON_ACTIVE;
        } else {
            const known = seasonsForRegionCode(seasons, regions, region).some(
                (s) => s.slug.toLowerCase() === season
            );
            if (!known) season = SEASON_ACTIVE;
        }
    }

    return region === raw.region && season === raw.season ? raw : { ...raw, region, season };
}

export function useTeamsFilters(regions: Region[], seasons: SeasonWithPlayoffConfig[]) {
    const router = useRouter();
    const pathname = usePathname();
    const searchParams = useSearchParams();

    const referenceDataLoaded = regions.length > 0 && seasons.length > 0;

    const raw: TeamsFilters = useMemo(
        () => ({
            region: (searchParams.get("region") ?? DEFAULT_TEAMS_FILTERS.region).toLowerCase(),
            season: (searchParams.get("season") ?? DEFAULT_TEAMS_FILTERS.season).toLowerCase(),
            q: searchParams.get("q") ?? DEFAULT_TEAMS_FILTERS.q,
        }),
        [searchParams]
    );

    // Normalizing against empty reference data would "repair" every valid region into `all`.
    const filters = referenceDataLoaded ? normalize(raw, regions, seasons) : raw;

    const write = useCallback(
        (next: TeamsFilters) => {
            const query = buildTeamsQuery(next);
            router.replace(query ? `${pathname}?${query}` : pathname, { scroll: false });
        },
        [pathname, router]
    );

    // Push the repaired URL back so a bookmarked bad link becomes a good one.
    useEffect(() => {
        if (!referenceDataLoaded) return;
        if (filters === raw) return;
        write(filters);
    }, [referenceDataLoaded, filters, raw, write]);

    const setRegion = useCallback(
        (region: string) => {
            let season = filters.season;

            if (isSpecificSeason(season)) {
                // Carry the slug across regions when the target region has a season by that name.
                const survives =
                    region !== REGION_ALL &&
                    seasonsForRegionCode(seasons, regions, region).some(
                        (s) => s.slug.toLowerCase() === season
                    );
                if (!survives) season = SEASON_ACTIVE;
            }

            write({ ...filters, region, season });
        },
        [filters, regions, seasons, write]
    );

    const setSeason = useCallback(
        (season: string) => write({ ...filters, season }),
        [filters, write]
    );

    const setQuery = useCallback((q: string) => write({ ...filters, q }), [filters, write]);

    const reset = useCallback(() => write(DEFAULT_TEAMS_FILTERS), [write]);

    return { filters, setRegion, setSeason, setQuery, reset, SEASON_ACTIVE, SEASON_INACTIVE };
}
