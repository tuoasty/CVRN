import {DBClient} from "@/shared/types/db";
import {Result} from "@/shared/types/result";
import {updateSeasonAwardName} from "@/server/db/seasonHistory.repo";
import {UpdateSeasonAwardInput} from "../types";

export async function updateSeasonAward(
    supabase: DBClient,
    p: UpdateSeasonAwardInput
): Promise<Result<true>> {
    return updateSeasonAwardName(supabase, p.awardId, p.awardName);
}
