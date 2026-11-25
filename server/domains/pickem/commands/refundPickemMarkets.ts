import {Err, Result} from "@/shared/types/result";
import {DBClient} from "@/shared/types/db";
import {serializeError} from "@/server/utils/serializeableError";
import {logger} from "@/server/utils/logger";
import {findPickemMarketRowsByIds, findPickemMatchesByIds, rpcRefundPickemMarkets} from "@/server/db/pickems.repo";
import {getPickemBoard} from "../queries/getPickemBoard";
import type {PickemBoard, RefundPickemsInput} from "../types";

const log = logger.child({module: "pickem/refund"});

export async function refundPickemMarkets(supabase: DBClient, input: RefundPickemsInput): Promise<Result<PickemBoard>> {
    try {
        const markets = await findPickemMarketRowsByIds(supabase, input.marketIds);
        if (!markets.ok) return markets;
        if (markets.value.length !== input.marketIds.length) return Err({message: "Some markets no longer exist. Refresh and try again.", code: "NOT_FOUND"});

        const matches = await findPickemMatchesByIds(supabase, [...new Set(markets.value.map(m => m.match_id))]);
        if (!matches.ok) return matches;
        if (matches.value.some(m => m.seasonId !== input.seasonId)) return Err({message: "Every market must belong to the selected season", code: "VALIDATION_ERROR"});

        const refunded = await rpcRefundPickemMarkets(supabase, input.marketIds);
        if (!refunded.ok) {
            log.error({seasonId: input.seasonId, marketIds: input.marketIds, error: refunded.error}, "Failed to refund pickems");
            return refunded;
        }

        log.info({
            seasonId: input.seasonId,
            marketIds: input.marketIds,
            picks: refunded.value.reduce((sum, r) => sum + r.picks, 0),
            refunded: refunded.value.reduce((sum, r) => sum + r.refunded, 0),
        }, "Pickems refunded");
        return getPickemBoard(supabase, input.seasonId);
    } catch (error) {
        return Err(serializeError(error));
    }
}
