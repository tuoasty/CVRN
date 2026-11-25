import {Err, Ok, Result} from "@/shared/types/result";
import {DBClient} from "@/shared/types/db";
import {serializeError} from "@/server/utils/serializeableError";
import {
    findPickemMarketRowsByIds,
    findPickemMatchesByIds,
    findPickemOutcomesByMarketIds,
    findUnclaimedPicks,
} from "@/server/db/pickems.repo";
import {toGamePayouts} from "../helpers/toGamePayouts";
import {toPickemMarketSource, toPickemOutcomeSource} from "../helpers/toPickemShapes";
import {PAYOUTS_PAGE_SIZE, type PayoutsResponse} from "../types/gameSchemas";

export async function getPickemPayouts(supabase: DBClient, robloxUserId: string): Promise<Result<PayoutsResponse>> {
    try {
        const picks = await findUnclaimedPicks(supabase, robloxUserId, PAYOUTS_PAGE_SIZE + 1);
        if (!picks.ok) return picks;

        const page = picks.value.slice(0, PAYOUTS_PAGE_SIZE);
        const marketIds = [...new Set(page.map(p => p.market_id))];
        const [markets, outcomes] = await Promise.all([
            findPickemMarketRowsByIds(supabase, marketIds),
            findPickemOutcomesByMarketIds(supabase, marketIds),
        ]);
        if (!markets.ok) return markets;
        if (!outcomes.ok) return outcomes;

        const matches = await findPickemMatchesByIds(supabase, [...new Set(markets.value.map(m => m.match_id))]);
        if (!matches.ok) return matches;

        return Ok({
            payouts: toGamePayouts({
                picks: page.map(p => ({id: p.id, marketId: p.market_id, outcomeKey: p.outcome_key, stake: p.stake, payout: p.payout})),
                markets: markets.value.map(toPickemMarketSource),
                outcomes: outcomes.value.map(o => ({...toPickemOutcomeSource(o), finalOdds: o.final_odds === null ? null : Number(o.final_odds)})),
                matches: matches.value,
            }),
            has_more: picks.value.length > PAYOUTS_PAGE_SIZE,
        });
    } catch (error) {
        return Err(serializeError(error));
    }
}
