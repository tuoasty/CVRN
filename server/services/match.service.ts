import {Result} from "@/shared/types/result";
import {DBClient, Match} from "@/shared/types/db";
import * as repo from "@/server/db/matches.repo"
import {logger} from "@/server/utils/logger";

export async function getMatches(supabase: DBClient): Promise<Result<Match[]>>{
    const result = await repo.findAllMatches(supabase);

    if(!result.ok){
        logger.error({error: result.error}, "Failed to fetch matches")
        throw new Error("Failed to fetch matches");
    }

    return result;
}