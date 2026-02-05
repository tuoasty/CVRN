import {Result} from "@/shared/types/result";
import {Match} from "@/shared/types/db";
import * as repo from "@/server/db/matches.repo"

export async function getMatches(): Promise<Result<Match[]>>{
    const result = await repo.findAllMatches();

    if(!result.ok){
        console.log("failed to fetch matches: ", result.error);
        throw new Error("Failed to fetch matches");
    }

    return result;
}