import {DBClient, Season, Spec, Team} from "@/shared/types/db";
import {Err, Ok, Result} from "@/shared/types/result";
import {serializeError} from "@/server/utils/serializeableError";
import {logger} from "@/server/utils/logger";
import {findTeamsBySeasonId} from "@/server/db/teams.repo";
import {getSpecCatalog, getSpecWinners, SpecWinnerWithRefs} from "@/server/domains/spec";
import {getAllMediaPosts, MediaPost} from "@/server/domains/media";
import {getAllRegions} from "@/server/domains/region";
import {AwardCategory, SeasonAllStarTeam, SeasonAwardEntryWithPlayer, SeasonPodiumEntryWithTeam} from "../types";
import {getSeasonById} from "./getSeasonById";
import {getSeasonPodium} from "./getSeasonPodium";
import {getSeasonAwards} from "./getSeasonAwards";
import {getSeasonAllStarTeams} from "./getSeasonAllStarTeams";
import {getAwardNameSuggestions} from "./getAwardNameSuggestions";

export interface SeasonResultsPageData {
    season: Season;
    regionCode: string | null;
    podium: SeasonPodiumEntryWithTeam[];
    awards: SeasonAwardEntryWithPlayer[];
    allStarTeams: SeasonAllStarTeam[];
    specs: Spec[];
    specWinners: SpecWinnerWithRefs[];
    teams: Team[];
    championGfx: MediaPost | null;
    suggestions: Partial<Record<AwardCategory, string[]>>;
}

const SUGGESTION_CATEGORIES = ["individual_winners", "all_star", "staff_team"] as const;

function valueOr<T, E>(result: Result<T, E>, fallback: T): T {
    return result.ok ? result.value : fallback;
}

export async function getSeasonResultsPage(
    supabase: DBClient,
    seasonId: string
): Promise<Result<SeasonResultsPageData>> {
    try {
        const [season, podium, awards, allStarTeams, specs, specWinners, teams, regions, gfx, ...suggestionResults] = await Promise.all([
            getSeasonById(supabase, {seasonId}),
            getSeasonPodium(supabase, seasonId),
            getSeasonAwards(supabase, seasonId),
            getSeasonAllStarTeams(supabase, seasonId),
            getSpecCatalog(supabase),
            getSpecWinners(supabase, seasonId),
            findTeamsBySeasonId(supabase, seasonId),
            getAllRegions(supabase),
            getAllMediaPosts(supabase, {type: "champion", seasonId}),
            ...SUGGESTION_CATEGORIES.map(category => getAwardNameSuggestions(supabase, {category})),
        ]);
        if (!season.ok) return season;

        const suggestions: SeasonResultsPageData["suggestions"] = {};
        SUGGESTION_CATEGORIES.forEach((category, i) => {
            const result = suggestionResults[i];
            if (result.ok) suggestions[category] = result.value;
        });
        const region = valueOr(regions, []).find(r => r.id === season.value.region_id);

        return Ok({
            season: season.value,
            regionCode: region?.code.toUpperCase() ?? null,
            podium: valueOr(podium, []),
            awards: valueOr(awards, []),
            allStarTeams: valueOr(allStarTeams, []),
            specs: valueOr(specs, []),
            specWinners: valueOr(specWinners, []),
            teams: valueOr(teams, []),
            championGfx: valueOr(gfx, [])[0] ?? null,
            suggestions,
        });
    } catch (error) {
        logger.error({error, seasonId}, "Unexpected error loading season results page");
        return Err(serializeError(error));
    }
}
