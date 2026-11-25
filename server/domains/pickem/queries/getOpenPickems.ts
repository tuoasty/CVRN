import {Err, Ok, Result} from "@/shared/types/result";
import {DBClient} from "@/shared/types/db";
import {serializeError} from "@/server/utils/serializeableError";
import {
    findOpenPickemMarketRows,
    findOpenPickemMatchesByIds,
    findPickemOutcomesByMarketIds,
    findPickemSettingsRow,
    findPlayerPicksByMarketIds,
    rpcPickemMarketOdds,
} from "@/server/db/pickems.repo";
import {toOpenPickems} from "../helpers/toOpenPickems";
import {toPickemMarketSource, toPickemOutcomeSource} from "../helpers/toPickemShapes";
import type {OpenPickemsResponse} from "../types/gameSchemas";

export async function getOpenPickems(supabase: DBClient, robloxUserId: string | null, now: Date = new Date()): Promise<Result<OpenPickemsResponse>> {
    try {
        const [settings, markets] = await Promise.all([findPickemSettingsRow(supabase), findOpenPickemMarketRows(supabase)]);
        if (!settings.ok) return settings;
        if (!markets.ok) return markets;

        const marketIds = markets.value.map(m => m.id);
        const matchIds = [...new Set(markets.value.map(m => m.match_id))];
        const [matches, outcomes, odds, picks] = await Promise.all([
            findOpenPickemMatchesByIds(supabase, matchIds),
            findPickemOutcomesByMarketIds(supabase, marketIds),
            rpcPickemMarketOdds(supabase, marketIds),
            robloxUserId ? findPlayerPicksByMarketIds(supabase, robloxUserId, marketIds) : Promise.resolve(Ok([])),
        ]);
        if (!matches.ok) return matches;
        if (!outcomes.ok) return outcomes;
        if (!odds.ok) return odds;
        if (!picks.ok) return picks;

        return Ok(toOpenPickems({
            matches: matches.value,
            markets: markets.value.map(toPickemMarketSource),
            outcomes: outcomes.value.map(toPickemOutcomeSource),
            odds: odds.value,
            picks: picks.value,
            stakeMin: settings.value.stake_min,
            stakeMax: settings.value.stake_max,
            now,
        }));
    } catch (error) {
        return Err(serializeError(error));
    }
}
