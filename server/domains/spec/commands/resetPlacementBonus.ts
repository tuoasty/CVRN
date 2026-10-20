import {DBClient} from "@/shared/types/db";
import {Result} from "@/shared/types/result";
import {upsertSpecBonus} from "@/server/db/specBonuses.repo";
import {DEFAULT_PLACEMENT_BONUS} from "../helpers/placementBonus";

export async function resetPlacementBonus(
    supabase: DBClient,
    regionId: string
): Promise<Result<true>> {
    return upsertSpecBonus(supabase, regionId, DEFAULT_PLACEMENT_BONUS);
}
