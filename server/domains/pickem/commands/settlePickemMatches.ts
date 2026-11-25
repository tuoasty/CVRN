import {Err, Ok, Result} from "@/shared/types/result";
import {DBClient} from "@/shared/types/db";
import {serializeError} from "@/server/utils/serializeableError";
import {logger} from "@/server/utils/logger";
import {
    findPickemMatchesByIds,
    findPickemOutcomesByMarketIds,
    rpcSettlePickemMatches,
} from "@/server/db/pickems.repo";
import {buildSettlePreview} from "../helpers/buildSettlePreview";
import {toPickemOutcomeSource} from "../helpers/toPickemShapes";
import {getPickemBoard} from "../queries/getPickemBoard";
import type {PickemBoard, PickemSettlePreview, SettlePickemsInput} from "../types";

const log = logger.child({module: "pickem/settle"});

async function validateSeason(supabase: DBClient, input: SettlePickemsInput): Promise<Result<true>> {
    const matches = await findPickemMatchesByIds(supabase, input.matchIds);
    if (!matches.ok) return matches;
    if (matches.value.length !== input.matchIds.length) return Err({message: "Some matches no longer exist. Refresh and try again.", code: "NOT_FOUND"});
    if (matches.value.some(m => m.seasonId !== input.seasonId)) return Err({message: "Every match must belong to the selected season", code: "VALIDATION_ERROR"});
    return Ok(true);
}

export async function previewPickemSettlement(supabase: DBClient, input: SettlePickemsInput): Promise<Result<PickemSettlePreview>> {
    try {
        const valid = await validateSeason(supabase, input);
        if (!valid.ok) return valid;

        const rows = await rpcSettlePickemMatches(supabase, input.matchIds, true);
        if (!rows.ok) return rows;

        const marketIds = [...new Set(rows.value.map(r => r.marketId))];
        const [matches, outcomes] = await Promise.all([
            findPickemMatchesByIds(supabase, input.matchIds),
            findPickemOutcomesByMarketIds(supabase, marketIds),
        ]);
        if (!matches.ok) return matches;
        if (!outcomes.ok) return outcomes;

        return Ok(buildSettlePreview(rows.value, matches.value, outcomes.value.map(toPickemOutcomeSource)));
    } catch (error) {
        return Err(serializeError(error));
    }
}

export async function settlePickemMatches(supabase: DBClient, input: SettlePickemsInput): Promise<Result<PickemBoard>> {
    try {
        const valid = await validateSeason(supabase, input);
        if (!valid.ok) return valid;

        const rows = await rpcSettlePickemMatches(supabase, input.matchIds, false);
        if (!rows.ok) {
            log.error({seasonId: input.seasonId, matchIds: input.matchIds, error: rows.error}, "Failed to settle pickems");
            return rows;
        }

        log.info({
            seasonId: input.seasonId,
            matchIds: input.matchIds,
            markets: new Set(rows.value.map(r => r.marketId)).size,
            staked: rows.value.reduce((sum, r) => sum + r.staked, 0),
            paid: rows.value.reduce((sum, r) => sum + r.payout, 0),
        }, "Pickems settled");
        return getPickemBoard(supabase, input.seasonId);
    } catch (error) {
        return Err(serializeError(error));
    }
}
