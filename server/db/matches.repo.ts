import {DBClient, Match} from "@/shared/types/db";
import {Err, Ok, Result} from "@/shared/types/result";

export async function findAllMatches(supabase: DBClient): Promise<Result<Match[]>>{
    try {
        const {data, error} = await supabase.from("matches").select("*");
        if (error) return Err(error);
        return Ok(data ?? []);
    } catch (error){
        return Err(error as Error);
    }
}