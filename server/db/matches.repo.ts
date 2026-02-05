import {Match} from "@/shared/types/db";
import {Err, Ok, Result} from "@/shared/types/result";
import {createPublicClient} from "@/server/supabase/server-public";

export async function findAllMatches(): Promise<Result<Match[]>>{
    try {
        const supabase= createPublicClient();
        const {data, error} = await supabase.from("matches").select("*");
        if (error) return Err(error);
        return Ok(data ?? []);
    } catch (error){
        return Err(error as Error);
    }
}