import {DBClient} from "@/shared/types/db";
import {Result} from "@/shared/types/result";
import {findSpecWinnersBySeason} from "@/server/db/specWinners.repo";
import {SpecWinnerWithRefs} from "../types";

export async function getSpecWinners(
    supabase: DBClient,
    seasonId: string
): Promise<Result<SpecWinnerWithRefs[]>> {
    return findSpecWinnersBySeason(supabase, seasonId);
}
