import {DBClient} from "@/shared/types/db";
import {Ok, Result} from "@/shared/types/result";
import {getSpecBonus} from "@/server/db/specBonuses.repo";
import {DEFAULT_PLACEMENT_BONUS, PlacementBonusConfig} from "../types";

export async function getPlacementBonus(
    supabase: DBClient,
    regionId: string
): Promise<Result<{config: PlacementBonusConfig; isCustom: boolean}>> {
    const res = await getSpecBonus(supabase, regionId);
    if (!res.ok) return res;
    return Ok({
        config: res.value ?? DEFAULT_PLACEMENT_BONUS,
        isCustom: res.value !== null,
    });
}
