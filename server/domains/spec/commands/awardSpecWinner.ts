import {DBClient} from "@/shared/types/db";
import {Result} from "@/shared/types/result";
import {upsertSpecWinner} from "@/server/db/specWinners.repo";
import {AwardSpecWinnerInput, SpecWinnerWithRefs} from "../types";

export async function awardSpecWinner(
    supabase: DBClient,
    input: AwardSpecWinnerInput
): Promise<Result<SpecWinnerWithRefs>> {
    return upsertSpecWinner(supabase, {
        seasonId: input.seasonId,
        specId: input.specId,
        playerId: input.playerId,
        starsAwarded: input.starsAwarded,
    });
}
