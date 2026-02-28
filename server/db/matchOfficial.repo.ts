import {DBClient} from "@/shared/types/db";
import {AssignOfficialInput, OfficialType} from "@/server/dto/matchOfficial.dto";

export async function assignOfficial(
    supabase: DBClient,
    p: AssignOfficialInput
) {
    return supabase.from("match_officials")
        .insert({
            match_id: p.matchId,
            official_id: p.officialId,
            official_type: p.officialType,
        })
        .select()
        .single()
}

export async function assignMultipleOfficials(
    supabase: DBClient,
    matchId: string,
    officialIds: string[],
    officialType: OfficialType
) {
    const inserts = officialIds.map(official_id => ({
        match_id: matchId,
        official_id,
        official_type: officialType,
    }));

    return supabase.from("match_officials")
        .insert(inserts)
        .select()
}

export async function findMatchOfficials(
    supabase: DBClient,
    matchId: string
) {
    return supabase.from("match_officials")
        .select(`
            *,
            official:officials(*)
        `)
        .eq("match_id", matchId)
}

export async function findMatchOfficialsByType(
    supabase: DBClient,
    matchId: string,
    officialType: OfficialType
) {
    return supabase.from("match_officials")
        .select(`
            *,
            official:officials(*)
        `)
        .eq("match_id", matchId)
        .eq("official_type", officialType)
}

export async function findOfficialMatches(
    supabase: DBClient,
    officialId: string
) {
    return supabase.from("match_officials")
        .select("*")
        .eq("official_id", officialId)
        .order("created_at", { ascending: false })
}

export async function removeOfficial(
    supabase: DBClient,
    matchId: string,
    officialId: string,
    officialType: OfficialType
) {
    return supabase.from("match_officials")
        .delete()
        .eq("match_id", matchId)
        .eq("official_id", officialId)
        .eq("official_type", officialType)
}

export async function removeAllOfficialsByType(
    supabase: DBClient,
    matchId: string,
    officialType: OfficialType
) {
    return supabase.from("match_officials")
        .delete()
        .eq("match_id", matchId)
        .eq("official_type", officialType)
}

export async function removeAllOfficialsFromMatch(
    supabase: DBClient,
    matchId: string
) {
    return supabase.from("match_officials")
        .delete()
        .eq("match_id", matchId)
}