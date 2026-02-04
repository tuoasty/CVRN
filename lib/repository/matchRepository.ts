import {createClient} from "@/lib/supabase/server";
import {Match} from "@/lib/types/match";
import {Err, Ok, Result} from "@/lib/result";

export async function findAllMatches(): Promise<Result<Match[]>>{
    try {
        const supabase = await createClient();
        const {data, error} = await supabase.from<Match>("matches").select("*");
        if (error) return Err(error);
        return Ok(data ?? []);
    } catch (error){
        return Err(error as Error);
    }
}