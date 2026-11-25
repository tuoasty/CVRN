import {Err, Ok, Result} from "@/shared/types/result";
import {DBClient} from "@/shared/types/db";
import {serializeError} from "@/server/utils/serializeableError";
import {findPickemMarketsByMatchIds} from "@/server/db/pickems.repo";
import type {PickemMatchSettlement} from "../types";

export async function getPickemMatchSettlement(supabase: DBClient, matchId: string): Promise<Result<PickemMatchSettlement>> {
    try {
        const markets = await findPickemMarketsByMatchIds(supabase, [matchId]);
        if (!markets.ok) return markets;
        const count = (status: string) => markets.value.filter(m => m.status === status).length;
        return Ok({open: count("open"), settled: count("settled"), refunded: count("refunded")});
    } catch (error) {
        return Err(serializeError(error));
    }
}
