import {Err, Ok, Result} from "@/shared/types/result";
import {DBClient} from "@/shared/types/db";
import {serializeError} from "@/server/utils/serializeableError";
import {
    findPickemMarketsByMatchIds,
    findPickemMatchesByIds,
    findPickemOutcomesByMarketIds,
    findPicksByMarketIds,
    rpcPickemMarketOdds,
} from "@/server/db/pickems.repo";
import {buildMatchDetail} from "../helpers/buildMatchDetail";
import {toPickemMarketSource, toPickemOutcomeSource} from "../helpers/toPickemShapes";
import type {PickemMatchDetail} from "../types";
import {resolveRobloxNames} from "./resolveRobloxNames";

export async function getPickemMatchDetail(supabase: DBClient, matchId: string): Promise<Result<PickemMatchDetail>> {
    try {
        const [matches, markets] = await Promise.all([
            findPickemMatchesByIds(supabase, [matchId]),
            findPickemMarketsByMatchIds(supabase, [matchId]),
        ]);
        if (!matches.ok) return matches;
        if (!markets.ok) return markets;
        const match = matches.value[0];
        if (!match) return Err({message: "Match not found", code: "NOT_FOUND"});

        const marketIds = markets.value.map(m => m.id);
        const [outcomes, odds, picks] = await Promise.all([
            findPickemOutcomesByMarketIds(supabase, marketIds),
            rpcPickemMarketOdds(supabase, marketIds),
            findPicksByMarketIds(supabase, marketIds),
        ]);
        if (!outcomes.ok) return outcomes;
        if (!odds.ok) return odds;
        if (!picks.ok) return picks;

        const names = await resolveRobloxNames(supabase, picks.value.map(p => p.robloxUserId));

        return Ok(buildMatchDetail({
            match,
            markets: markets.value.map(toPickemMarketSource),
            outcomes: outcomes.value.map(toPickemOutcomeSource),
            odds: odds.value,
            picks: picks.value,
            names,
        }));
    } catch (error) {
        return Err(serializeError(error));
    }
}
