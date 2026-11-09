import type {DBClient} from "@/shared/types/db";
import type {Result} from "@/shared/types/result";
import {findBoosterRobloxIds} from "@/server/db/boosters.repo";

export async function getBoosterRobloxIds(supabase: DBClient): Promise<Result<string[]>> {
    return findBoosterRobloxIds(supabase);
}
