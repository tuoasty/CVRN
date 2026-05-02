import {DBClient, MatchOfficial, Official} from "@/shared/types/db";
import {AssignOfficialInput, OfficialType} from "@/server/domains/matchOfficial";
import {Err, Ok, Result} from "@/shared/types/result";
import {serializeError} from "@/server/utils/serializeableError";

type MatchOfficialWithOfficial = MatchOfficial & {official: Official | null};

export async function assignOfficial(supabase: DBClient, p: AssignOfficialInput): Promise<Result<MatchOfficial>> {
    const {data, error} = await supabase.from("match_officials")
        .insert({
            match_id: p.matchId,
            official_id: p.officialId,
            official_type: p.officialType,
        })
        .select()
        .single();
    if (error) return Err(serializeError(error, "DB_ERROR"));
    return Ok(data);
}

export async function assignMultipleOfficials(
    supabase: DBClient,
    matchId: string,
    officialIds: string[],
    officialType: OfficialType
): Promise<Result<MatchOfficial[]>> {
    const inserts = officialIds.map(official_id => ({
        match_id: matchId,
        official_id,
        official_type: officialType,
    }));

    const {data, error} = await supabase.from("match_officials")
        .insert(inserts)
        .select();
    if (error) return Err(serializeError(error, "DB_ERROR"));
    return Ok(data ?? []);
}

export async function findMatchOfficials(supabase: DBClient, matchId: string): Promise<Result<MatchOfficialWithOfficial[]>> {
    const {data, error} = await supabase.from("match_officials")
        .select(`
            *,
            official:officials(*)
        `)
        .eq("match_id", matchId);
    if (error) return Err(serializeError(error, "DB_ERROR"));
    return Ok((data ?? []) as unknown as MatchOfficialWithOfficial[]);
}

export async function findMatchOfficialsByType(
    supabase: DBClient,
    matchId: string,
    officialType: OfficialType
): Promise<Result<MatchOfficialWithOfficial[]>> {
    const {data, error} = await supabase.from("match_officials")
        .select(`
            *,
            official:officials(*)
        `)
        .eq("match_id", matchId)
        .eq("official_type", officialType);
    if (error) return Err(serializeError(error, "DB_ERROR"));
    return Ok((data ?? []) as unknown as MatchOfficialWithOfficial[]);
}

export async function findOfficialMatches(supabase: DBClient, officialId: string): Promise<Result<MatchOfficial[]>> {
    const {data, error} = await supabase.from("match_officials")
        .select("*")
        .eq("official_id", officialId)
        .order("created_at", {ascending: false});
    if (error) return Err(serializeError(error, "DB_ERROR"));
    return Ok(data ?? []);
}

export async function removeOfficial(
    supabase: DBClient,
    matchId: string,
    officialId: string,
    officialType: OfficialType
): Promise<Result<true>> {
    const {error} = await supabase.from("match_officials")
        .delete()
        .eq("match_id", matchId)
        .eq("official_id", officialId)
        .eq("official_type", officialType);
    if (error) return Err(serializeError(error, "DB_ERROR"));
    return Ok(true);
}

export async function removeAllOfficialsByType(
    supabase: DBClient,
    matchId: string,
    officialType: OfficialType
): Promise<Result<true>> {
    const {error} = await supabase.from("match_officials")
        .delete()
        .eq("match_id", matchId)
        .eq("official_type", officialType);
    if (error) return Err(serializeError(error, "DB_ERROR"));
    return Ok(true);
}

export async function removeAllMatchOfficials(supabase: DBClient, matchId: string): Promise<Result<true>> {
    const {error} = await supabase
        .from("match_officials")
        .delete()
        .eq("match_id", matchId);
    if (error) return Err(serializeError(error, "DB_ERROR"));
    return Ok(true);
}
