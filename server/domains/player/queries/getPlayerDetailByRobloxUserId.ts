import {Err, Ok, Result} from "@/shared/types/result";
import {DBClient} from "@/shared/types/db";
import {serializeError} from "@/server/utils/serializeableError";
import {logger} from "@/server/utils/logger";
import {getPlayerByRobloxUserId} from "./getPlayerByRobloxUserId";
import {getPlayerAchievements} from "./getPlayerAchievements";
import {getPlayerAwards} from "./getPlayerAwards";
import {getPlayerSpecs} from "./getPlayerSpecs";
import {findSeasonsBySeasonNumber} from "@/server/db/seasons.repo";
import {PlayerDetailApiResponse} from "../types";

const DETAIL_AWARD_CATEGORIES = new Set(["individual_winners", "staff_team", "first_team", "all_star"]);

export async function getPlayerDetailByRobloxUserId(
    supabase: DBClient,
    p: {robloxUserId: string; seasonNumber: number | null}
): Promise<Result<PlayerDetailApiResponse>> {
    try {
        const existing = await getPlayerByRobloxUserId(supabase, p.robloxUserId);
        if (!existing.ok) return existing;
        if (!existing.value) return Err({message: "Player not found", code: "NOT_FOUND"});
        const playerId = existing.value.id;

        const [achievementsRes, awardsRes, specsRes] = await Promise.all([
            getPlayerAchievements(supabase, {playerId}),
            getPlayerAwards(supabase, {playerId}),
            getPlayerSpecs(supabase, {playerId}),
        ]);
        if (!achievementsRes.ok) return achievementsRes;
        if (!awardsRes.ok) return awardsRes;
        if (!specsRes.ok) return specsRes;

        let seasonIdFilter: Set<string> | null = null;
        if (p.seasonNumber !== null) {
            const seasonsRes = await findSeasonsBySeasonNumber(supabase, p.seasonNumber);
            if (!seasonsRes.ok) return seasonsRes;
            seasonIdFilter = new Set(seasonsRes.value.map(s => s.id));
        }
        const inSeason = (seasonId: string) => !seasonIdFilter || seasonIdFilter.has(seasonId);

        return Ok({
            achievements: achievementsRes.value.filter(a => inSeason(a.season_id)),
            awards: awardsRes.value
                .filter(a => DETAIL_AWARD_CATEGORIES.has(a.category) && inSeason(a.season_id))
                .map(a => ({award_name: a.award_name, category: a.category, season_id: a.season_id, season_name: a.season_name})),
            spec_awards: specsRes.value
                .filter(s => inSeason(s.season_id))
                .map(s => ({
                    name: s.spec_name,
                    position: s.position,
                    stars: s.stars,
                    season_id: s.season_id,
                    season_name: s.season_name,
                })),
        });
    } catch (error) {
        logger.error({error}, "Unexpected error fetching player detail");
        return Err(serializeError(error));
    }
}
