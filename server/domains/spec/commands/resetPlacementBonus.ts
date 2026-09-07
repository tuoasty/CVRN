import {DBClient} from "@/shared/types/db";
import {Result} from "@/shared/types/result";
import {deleteSpecBonus} from "@/server/db/specBonuses.repo";

export async function resetPlacementBonus(
    supabase: DBClient,
    regionId: string
): Promise<Result<true>> {
    return deleteSpecBonus(supabase, regionId);
}
