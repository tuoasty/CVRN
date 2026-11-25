import {Err, Ok, Result} from "@/shared/types/result";
import {DBClient} from "@/shared/types/db";
import {serializeError} from "@/server/utils/serializeableError";
import {
    findPickemMarketsByMatchIds,
    findPickemMatchesBySeason,
    findPickemOutcomesByMarketIds,
    findPickemSettingsRow,
    rpcPickemMarketOdds,
} from "@/server/db/pickems.repo";
import {buildPickemBoard} from "../helpers/buildPickemBoard";
import {toPickemMarketSource, toPickemOutcomeSource, toPickemSettings} from "../helpers/toPickemShapes";
import type {PickemBoard} from "../types";

export async function getPickemBoard(supabase: DBClient, seasonId: string, now: Date = new Date()): Promise<Result<PickemBoard>> {
    try {
        const [settings, matches] = await Promise.all([
            findPickemSettingsRow(supabase),
            findPickemMatchesBySeason(supabase, seasonId),
        ]);
        if (!settings.ok) return settings;
        if (!matches.ok) return matches;

        const markets = await findPickemMarketsByMatchIds(supabase, matches.value.map(m => m.id));
        if (!markets.ok) return markets;

        const marketIds = markets.value.map(m => m.id);
        const [outcomes, odds] = await Promise.all([
            findPickemOutcomesByMarketIds(supabase, marketIds),
            rpcPickemMarketOdds(supabase, marketIds),
        ]);
        if (!outcomes.ok) return outcomes;
        if (!odds.ok) return odds;

        return Ok(buildPickemBoard({
            settings: toPickemSettings(settings.value),
            matches: matches.value,
            markets: markets.value.map(toPickemMarketSource),
            outcomes: outcomes.value.map(toPickemOutcomeSource),
            odds: odds.value,
            now,
        }));
    } catch (error) {
        return Err(serializeError(error));
    }
}
