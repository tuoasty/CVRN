import {DBClient} from "@/shared/types/db";
import {Ok, Result} from "@/shared/types/result";
import {upsertSpecBonus} from "@/server/db/specBonuses.repo";
import {PlacementBonusConfig, SavePlacementBonusInput} from "../types";

export async function savePlacementBonus(
    supabase: DBClient,
    input: SavePlacementBonusInput
): Promise<Result<PlacementBonusConfig>> {
    const res = await upsertSpecBonus(supabase, input.regionId, input.config);
    if (!res.ok) return res;
    return Ok(input.config);
}
