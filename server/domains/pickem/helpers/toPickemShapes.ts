import type {PickemMarketRow, PickemOutcomeRow, PickemSettingsRow} from "@/shared/types/db";
import type {PickemMarketSource, PickemOutcomeSource, PickemSettings} from "../types";

export function toPickemSettings(row: PickemSettingsRow): PickemSettings {
    return {
        seed: row.seed,
        rake: Number(row.rake),
        oddsFloor: Number(row.odds_floor),
        sigma: Number(row.sigma),
        shrinkSets: Number(row.shrink_sets),
        probClamp: Number(row.prob_clamp),
        stakeMin: row.stake_min,
        stakeMax: row.stake_max,
        updatedAt: row.updated_at,
    };
}

export function toPickemMarketSource(row: PickemMarketRow): PickemMarketSource {
    return {id: row.id, matchId: row.match_id, kind: row.kind, status: row.status, resultOutcome: row.result_outcome};
}

export function toPickemOutcomeSource(row: PickemOutcomeRow): PickemOutcomeSource {
    return {marketId: row.market_id, key: row.key, label: row.label, sortOrder: row.sort_order, startProb: Number(row.start_prob)};
}
