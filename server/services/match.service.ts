import {Result} from "@/shared/types/result";
import {DBClient, Match} from "@/shared/types/db";
import * as repo from "@/server/db/matches.repo"

export async function getMatches(supabase: DBClient): Promise<Result<Match[]>>{
    const result = await repo.findAllMatches(supabase);

    if(!result.ok){
        console.log("failed to fetch matches: ", result.error);
        throw new Error("Failed to fetch matches");
    }

    return result;
}