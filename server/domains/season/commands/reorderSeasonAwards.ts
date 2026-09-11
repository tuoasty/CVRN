import {DBClient} from "@/shared/types/db";
import {Result} from "@/shared/types/result";
import {updateSeasonAwardOrders} from "@/server/db/seasonHistory.repo";
import {ReorderSeasonAwardsInput} from "../types";

export async function reorderSeasonAwards(
    supabase: DBClient,
    p: ReorderSeasonAwardsInput
): Promise<Result<true>> {
    return updateSeasonAwardOrders(supabase, p.updates);
}
