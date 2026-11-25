import {DBClient} from "@/shared/types/db";
import {logger} from "@/server/utils/logger";
import {
    findPickemMarketRowById,
    findPickemMatchesByIds,
    findPickemOutcomesByMarketIds,
    rpcPickemMarketOdds,
    rpcPlacePickemPick,
    type PickFailure,
} from "@/server/db/pickems.repo";
import {buildMarketViews} from "../helpers/buildPickemBoard";
import {toPickemMarketSource, toPickemOutcomeSource} from "../helpers/toPickemShapes";
import type {PlacePickBody, PlacePickResponse} from "../types/gameSchemas";

const log = logger.child({module: "pickem/placePick"});

async function readMarketOdds(supabase: DBClient, marketId: string): Promise<Pick<PlacePickResponse, "pool" | "outcomes">> {
    const market = await findPickemMarketRowById(supabase, marketId);
    if (!market.ok || !market.value) return {pool: 0, outcomes: []};
    const [matches, outcomes, odds] = await Promise.all([
        findPickemMatchesByIds(supabase, [market.value.match_id]),
        findPickemOutcomesByMarketIds(supabase, [marketId]),
        rpcPickemMarketOdds(supabase, [marketId]),
    ]);
    if (!matches.ok || !outcomes.ok || !odds.ok) return {pool: 0, outcomes: []};
    const match = matches.value[0];
    const teamLabel = (key: string) => key === "home" ? match?.home?.name ?? null : key === "away" ? match?.away?.name ?? null : null;
    const [view] = buildMarketViews([toPickemMarketSource(market.value)], outcomes.value.map(toPickemOutcomeSource), odds.value, teamLabel);
    if (!view) return {pool: 0, outcomes: []};
    return {pool: view.pool, outcomes: view.outcomes.map(o => ({key: o.key, label: o.label, odds: o.odds}))};
}

export async function placePickemPick(
    supabase: DBClient,
    body: PlacePickBody,
): Promise<{ok: true; value: PlacePickResponse} | {ok: false; error: PickFailure}> {
    const placed = await rpcPlacePickemPick(supabase, body);
    if (!placed.ok) return placed;

    let market: Pick<PlacePickResponse, "pool" | "outcomes"> = {pool: 0, outcomes: []};
    try {
        market = await readMarketOdds(supabase, body.market_id);
    } catch (error) {
        log.error({error, marketId: body.market_id}, "Pick saved but odds read failed");
    }

    return {
        ok: true,
        value: {
            pick: {pick_id: placed.value.pickId, market_id: body.market_id, outcome: placed.value.outcomeKey, stake: placed.value.stake},
            charged: placed.value.charged,
            replayed: placed.value.replayed,
            ...market,
        },
    };
}
