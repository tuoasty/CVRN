import {Err, Ok, Result} from "@/lib/result";
import {Match} from "@/lib/types/db";
import {createPublicClient} from "@/lib/supabase/server-public";

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