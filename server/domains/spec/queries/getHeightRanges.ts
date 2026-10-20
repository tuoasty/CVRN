import {DBClient} from "@/shared/types/db";
import {Result} from "@/shared/types/result";
import {getSpecHeightRanges} from "@/server/db/specBonuses.repo";
import {HeightRangeByStar} from "../helpers/heightRange";

export async function getHeightRanges(
    supabase: DBClient,
    regionId: string
): Promise<Result<HeightRangeByStar>> {
    return getSpecHeightRanges(supabase, regionId);
}
