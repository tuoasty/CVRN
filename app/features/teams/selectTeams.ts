import { TeamWithRegion } from "@/server/domains/team";
import { SeasonWithPlayoffConfig } from "@/server/domains/season";
import { isSeasonActive } from "@/server/domains/season/helpers/isSeasonActive";

export const REGION_ALL = "all" as const;
export const SEASON_ACTIVE = "active" as const;
export const SEASON_INACTIVE = "inactive" as const;

export type RegionFilter = typeof REGION_ALL | string;

export type SeasonFilter = typeof SEASON_ACTIVE | typeof SEASON_INACTIVE | string;

export interface TeamsFilters {
    region: RegionFilter;
    season: SeasonFilter;
    q: string;
}

export const DEFAULT_TEAMS_FILTERS: TeamsFilters = {
    region: REGION_ALL,
    season: SEASON_ACTIVE,
    q: "",
};

export function isSpecificSeason(season: SeasonFilter): boolean {
    return season !== SEASON_ACTIVE && season !== SEASON_INACTIVE;
}

interface SelectTeamsArgs {
    teams: TeamWithRegion[];
    seasons: SeasonWithPlayoffConfig[];
    filters: TeamsFilters;
}

export function selectTeams({ teams, seasons, filters }: SelectTeamsArgs): TeamWithRegion[] {
    const activeSeasonIds = new Set(
        seasons.filter(isSeasonActive).map((season) => season.id)
    );

    const query = filters.q.trim().toLowerCase();

    return teams.filter((team) => {
        if (!team.seasons?.regions?.code || !team.seasons.slug) return false;

        if (filters.region !== REGION_ALL) {
            if (team.seasons.regions.code.toLowerCase() !== filters.region) return false;
        }

        if (filters.season === SEASON_ACTIVE) {
            if (!activeSeasonIds.has(team.season_id)) return false;
        } else if (filters.season === SEASON_INACTIVE) {
            if (activeSeasonIds.has(team.season_id)) return false;
        } else if (team.seasons.slug.toLowerCase() !== filters.season) {
            return false;
        }

        if (query && !team.name?.toLowerCase().includes(query)) return false;

        return true;
    });
}
