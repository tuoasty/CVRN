import {DBClient, Team} from "@/shared/types/db";
import {InsertTeamDto} from "@/server/domains/team";
import {Err, Ok, Result} from "@/shared/types/result";
import {serializeError} from "@/server/utils/serializeableError";

type TeamWithRegionRow = Team & {
    seasons: {
        id: string;
        name: string;
        slug: string;
        regions: {id: string; code: string; name: string};
    };
};

export async function findAllTeams(supabase: DBClient): Promise<Result<Team[]>> {
    const {data, error} = await supabase.from("teams").select("*").eq("is_bye", false);
    if (error) return Err(serializeError(error, "DB_ERROR"));
    return Ok(data ?? []);
}

export async function findAllTeamsWithRegions(supabase: DBClient): Promise<Result<TeamWithRegionRow[]>> {
    const {data, error} = await supabase
        .from("teams")
        .select(`
            *,
            seasons!inner (
                id,
                name,
                slug,
                regions!inner (
                    id,
                    code,
                    name
                )
            )
        `)
        .is("deleted_at", null)
        .eq("is_bye", false);
    if (error) return Err(serializeError(error, "DB_ERROR"));
    return Ok((data ?? []) as unknown as TeamWithRegionRow[]);
}

export async function findTeamById(supabase: DBClient, id: string): Promise<Result<Team | null>> {
    const {data, error} = await supabase.from("teams").select("*").eq("id", id).single();
    if (error) {
        if (error.code === "PGRST116") return Ok(null);
        return Err(serializeError(error, "DB_ERROR"));
    }
    return Ok(data);
}

export async function findTeamByNameAndSeason(supabase: DBClient, p: {
    name: string;
    seasonId: string;
}): Promise<Result<Team | null>> {
    const {data, error} = await supabase
        .from("teams")
        .select("*")
        .ilike("name", p.name)
        .eq("season_id", p.seasonId)
        .is("deleted_at", null)
        .eq("is_bye", false)
        .single();
    if (error) {
        if (error.code === "PGRST116") return Ok(null);
        return Err(serializeError(error, "DB_ERROR"));
    }
    return Ok(data);
}

export async function insertTeam(supabase: DBClient, p: InsertTeamDto): Promise<Result<Team>> {
    const {data, error} = await supabase.from("teams").insert({
        ...(p.id && {id: p.id}),
        name: p.name,
        slug: p.slug,
        logo_url: p.logoUrl,
        season_id: p.seasonId,
        brick_number: p.brickNumber,
        brick_color: p.brickColor,
        starting_lvr: p.startingLvr,
    }).select().single();
    if (error) return Err(serializeError(error, "DB_ERROR"));
    return Ok(data);
}

export async function updateTeamById(supabase: DBClient, id: string, p: {
    name?: string;
    slug?: string;
    logoUrl?: string;
    brickNumber?: number;
    brickColor?: string;
    startingLvr?: number;
}): Promise<Result<Team>> {
    const {data, error} = await supabase
        .from("teams")
        .update({
            ...(p.name !== undefined && {name: p.name}),
            ...(p.slug !== undefined && {slug: p.slug}),
            ...(p.logoUrl !== undefined && {logo_url: p.logoUrl}),
            ...(p.brickNumber !== undefined && {brick_number: p.brickNumber}),
            ...(p.brickColor !== undefined && {brick_color: p.brickColor}),
            ...(p.startingLvr !== undefined && {starting_lvr: p.startingLvr}),
        })
        .eq("id", id)
        .is("deleted_at", null)
        .select()
        .single();
    if (error) return Err(serializeError(error, "DB_ERROR"));
    return Ok(data);
}

export async function deleteTeamById(supabase: DBClient, id: string): Promise<Result<true>> {
    const {error} = await supabase.from("teams").delete().eq("id", id);
    if (error) return Err(serializeError(error, "DB_ERROR"));
    return Ok(true);
}

export async function findTeamBySlugAndSeason(supabase: DBClient, p: {
    slug: string;
    seasonId: string;
}): Promise<Result<Team | null>> {
    const {data, error} = await supabase
        .from("teams")
        .select("*")
        .eq("slug", p.slug)
        .eq("season_id", p.seasonId)
        .is("deleted_at", null)
        .eq("is_bye", false)
        .single();
    if (error) {
        if (error.code === "PGRST116") return Ok(null);
        return Err(serializeError(error, "DB_ERROR"));
    }
    return Ok(data);
}

export async function findTeamBySlugAndSeasonWithRegion(supabase: DBClient, p: {
    slug: string;
    seasonId: string;
}): Promise<Result<TeamWithRegionRow | null>> {
    const {data, error} = await supabase
        .from("teams")
        .select(`
            *,
            seasons!inner (
                id,
                name,
                slug,
                regions!inner (
                    id,
                    code,
                    name
                )
            )
        `)
        .eq("slug", p.slug)
        .eq("season_id", p.seasonId)
        .is("deleted_at", null)
        .eq("is_bye", false)
        .single();
    if (error) {
        if (error.code === "PGRST116") return Ok(null);
        return Err(serializeError(error, "DB_ERROR"));
    }
    return Ok(data as unknown as TeamWithRegionRow);
}

export async function findTeamByIdWithRegion(supabase: DBClient, teamId: string): Promise<Result<TeamWithRegionRow | null>> {
    const {data, error} = await supabase
        .from('teams')
        .select(`
            *,
            seasons!inner (
                id,
                name,
                slug,
                regions!inner (
                    id,
                    code,
                    name
                )
            )
        `)
        .eq('id', teamId)
        .is("deleted_at", null)
        .eq("is_bye", false)
        .single();
    if (error) {
        if (error.code === "PGRST116") return Ok(null);
        return Err(serializeError(error, "DB_ERROR"));
    }
    return Ok(data as unknown as TeamWithRegionRow);
}

export async function softDeleteTeamById(supabase: DBClient, id: string): Promise<Result<true>> {
    const {error} = await supabase
        .from("teams")
        .update({deleted_at: new Date().toISOString()})
        .eq("id", id)
        .is("deleted_at", null);
    if (error) return Err(serializeError(error, "DB_ERROR"));
    return Ok(true);
}

export async function findTeamsByIds(supabase: DBClient, teamIds: string[]): Promise<Result<TeamWithRegionRow[]>> {
    const {data, error} = await supabase
        .from("teams")
        .select(`
            *,
            seasons!inner(
                id,
                name,
                slug,
                regions!inner(
                    id,
                    code,
                    name
                )
            )
        `)
        .in("id", teamIds)
        .is("deleted_at", null);
    if (error) return Err(serializeError(error, "DB_ERROR"));
    return Ok((data ?? []) as unknown as TeamWithRegionRow[]);
}
