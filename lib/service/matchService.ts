import * as repository from "@/lib/repository/matchRepository"
import {Result} from "@/lib/result";
import {Match} from "@/lib/types/match";

export async function getMatches(): Promise<Result<Match[]>>{
    const result = await repository.findAllMatches();

    if(!result.ok){
        console.log("failed to fetch matches: ", result.error);
        return result;
    }

    return result;
}