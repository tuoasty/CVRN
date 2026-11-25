import {Err, Result} from "@/shared/types/result";
import {DBClient} from "@/shared/types/db";
import {serializeError} from "@/server/utils/serializeableError";
import {logger} from "@/server/utils/logger";
import {findSeasonById} from "@/server/db/seasons.repo";
import {findTeamStrengthRatings} from "@/server/db/teamStrength.repo";
import {
    findPickemMarketsByMatchIds,
    findPickemMatchesByIds,
    findPickemSettingsRow,
    rpcPublishPickemMarkets,
} from "@/server/db/pickems.repo";
import {publishBlockReason} from "../helpers/buildPickemBoard";
import {buildPublishDrafts} from "../helpers/buildPublishDrafts";
import {toPickemSettings} from "../helpers/toPickemShapes";
import type {TeamRating} from "../helpers/startingChance";
import {getPickemBoard} from "../queries/getPickemBoard";
import type {PickemBoard, PublishPickemsInput} from "../types";

function matchName(match: {matchCode: string | null; home: {name: string} | null; away: {name: string} | null}): string {
    if (match.matchCode) return match.matchCode;
    return `${match.home?.name ?? "TBD"} vs ${match.away?.name ?? "TBD"}`;
}

export async function publishPickemMatches(supabase: DBClient, input: PublishPickemsInput, now: Date = new Date()): Promise<Result<PickemBoard>> {
    try {
        const [season, settings, matches, existing] = await Promise.all([
            findSeasonById(supabase, input.seasonId),
            findPickemSettingsRow(supabase),
            findPickemMatchesByIds(supabase, input.matchIds),
            findPickemMarketsByMatchIds(supabase, input.matchIds),
        ]);
        if (!season.ok) return season;
        if (!season.value) return Err({message: "Season not found", code: "NOT_FOUND"});
        if (!settings.ok) return settings;
        if (!matches.ok) return matches;
        if (!existing.ok) return existing;

        if (matches.value.length !== input.matchIds.length) return Err({message: "Some matches no longer exist. Refresh and try again.", code: "NOT_FOUND"});
        if (matches.value.some(m => m.seasonId !== input.seasonId)) return Err({message: "Every match must belong to the selected season", code: "VALIDATION_ERROR"});

        const published = new Set(existing.value.map(m => m.match_id));
        const problems = matches.value.flatMap(match => {
            if (published.has(match.id)) return [`${matchName(match)}: already published`];
            const reason = publishBlockReason(match, now);
            return reason ? [`${matchName(match)}: ${reason.toLowerCase()}`] : [];
        });
        if (problems.length > 0) return Err({message: problems.join("; "), code: "VALIDATION_ERROR"});

        const strengths = await findTeamStrengthRatings(supabase, season.value.season_number);
        if (!strengths.ok) return strengths;
        const ratings = new Map<string, TeamRating>(
            strengths.value
                .filter(s => s.seasonId === input.seasonId)
                .map(s => [s.teamId, {rating: s.rating, sets: s.sets}]),
        );

        const drafts = buildPublishDrafts(matches.value, ratings, toPickemSettings(settings.value));
        const inserted = await rpcPublishPickemMarkets(supabase, drafts);
        if (!inserted.ok) {
            logger.error({seasonId: input.seasonId, matchIds: input.matchIds, error: inserted.error}, "Failed to publish pickems");
            return inserted;
        }

        logger.info({seasonId: input.seasonId, matchIds: input.matchIds, markets: inserted.value.length}, "Pickems published");
        return getPickemBoard(supabase, input.seasonId, now);
    } catch (error) {
        return Err(serializeError(error));
    }
}
