import {DBClient, Team} from "@/shared/types/db";
import {InsertTeamDto} from "@/server/domains/team";
import {Err, Ok, Result} from "@/shared/types/result";
import {serializeError} from "@/server/utils/serializeableError";

type UpsertTeamByNumberDto = {
    seasonId: string;
    teamNumber: number;
    name: string;
    slug: string;
    brickColor?: string | null;
    brickNumber?: number | null;
};

type ActiveMember = {
    role: string;
    player: { display_name: string | null; avatar_url: string | null } | null;
};

type TeamWithRegionRow = Team & {
    seasons: {
        id: string;
        name: string;
        slug: string;
        max_players: number;
        regions: { id: string; code: string; name: string };
    };
    player_team_seasons?: ActiveMember[] | null;
    playerCount?: number;
    captain?: { displayName: string | null; avatarUrl: string | null } | null;
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
                max_players,
                regions!inner (
                    id,
                    code,
                    name
                )
            ),
            player_team_seasons (
                role,
                player:players (display_name, avatar_url)
            )
        `)
        .is("deleted_at", null)
        .eq("is_bye", false)
        .is("player_team_seasons.left_at", null)
        .order("name", { ascending: true });
    if (error) return Err(serializeError(error, "DB_ERROR"));
    const rows = (data ?? []) as unknown as TeamWithRegionRow[];
    return Ok(rows.map(row => {
        const members = row.player_team_seasons ?? [];
        const captainRow = members.find(m => m.role === "captain");
        return {
            ...row,
            playerCount: members.length,
            captain: captainRow
                ? {
                    displayName: captainRow.player?.display_name ?? null,
                    avatarUrl: captainRow.player?.avatar_url ?? null,
                  }
                : null,
        };
    }));
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
        logo_url: p.logoUrl ?? null,
        logo_bg_removed: p.logoBgRemoved,
        season_id: p.seasonId,
        brick_number: p.brickNumber,
        brick_color: p.brickColor,
        starting_lvr: p.startingLvr,
        starting_points: p.startingPoints,
    }).select().single();
    if (error) return Err(serializeError(error, "DB_ERROR"));
    return Ok(data);
}

export async function getOrCreateByeTeam(supabase: DBClient, seasonId: string): Promise<Result<Team>> {
    const {data: existing, error: findError} = await supabase
        .from("teams")
        .select("*")
        .eq("season_id", seasonId)
        .eq("is_bye", true)
        .maybeSingle();
    if (findError) return Err(serializeError(findError, "DB_ERROR"));
    if (existing) return Ok(existing);

    const {data, error} = await supabase
        .from("teams")
        .insert({
            name: "BYE",
            slug: "bye",
            season_id: seasonId,
            brick_number: 0,
            brick_color: "White",
            starting_lvr: 100,
            is_bye: true,
        })
        .select()
        .single();
    if (error) return Err(serializeError(error, "DB_ERROR"));
    return Ok(data);
}

export async function findTeamsBySeasonId(supabase: DBClient, seasonId: string): Promise<Result<Team[]>> {
    const {data, error} = await supabase
        .from("teams")
        .select("*")
        .eq("season_id", seasonId)
        .is("deleted_at", null)
        .eq("is_bye", false);
    if (error) return Err(serializeError(error, "DB_ERROR"));
    return Ok(data ?? []);
}

export async function findAllTeamsBySeasonIdIncludingDeleted(supabase: DBClient, seasonId: string): Promise<Result<Team[]>> {
    const {data, error} = await supabase
        .from("teams")
        .select("*")
        .eq("season_id", seasonId)
        .eq("is_bye", false);
    if (error) return Err(serializeError(error, "DB_ERROR"));
    return Ok(data ?? []);
}

export async function findTeamByNumberAndSeason(supabase: DBClient, p: {
    teamNumber: number;
    seasonId: string;
}): Promise<Result<Team | null>> {
    const {data, error} = await supabase
        .from("teams")
        .select("*")
        .eq("team_number", p.teamNumber)
        .eq("season_id", p.seasonId)
        .is("deleted_at", null)
        .maybeSingle();
    if (error) return Err(serializeError(error, "DB_ERROR"));
    return Ok(data);
}

export async function upsertTeamByNumber(supabase: DBClient, p: UpsertTeamByNumberDto): Promise<Result<Team>> {
    const existing = await findTeamByNumberAndSeason(supabase, {
        teamNumber: p.teamNumber,
        seasonId: p.seasonId,
    });
    if (!existing.ok) return existing;

    if (existing.value) {
        const updates: Record<string, unknown> = {};
        if (existing.value.name !== p.name) updates.name = p.name;
        if (existing.value.name !== p.name) updates.slug = p.slug;
        if (p.brickColor != null && existing.value.brick_color !== p.brickColor) updates.brick_color = p.brickColor;
        if (p.brickNumber != null && existing.value.brick_number !== p.brickNumber) updates.brick_number = p.brickNumber;

        if (Object.keys(updates).length === 0) return Ok(existing.value);

        const {data, error} = await supabase
            .from("teams")
            .update(updates)
            .eq("id", existing.value.id)
            .select()
            .single();
        if (error) return Err(serializeError(error, "DB_ERROR"));
        return Ok(data);
    }

    const {data, error} = await supabase
        .from("teams")
        .insert({
            name: p.name,
            slug: p.slug,
            season_id: p.seasonId,
            team_number: p.teamNumber,
            brick_number: p.brickNumber ?? null,
            brick_color: p.brickColor ?? null,
            starting_lvr: 100,
        })
        .select()
        .single();
    if (error) return Err(serializeError(error, "DB_ERROR"));
    return Ok(data);
}

export async function updateTeamById(supabase: DBClient, id: string, p: {
    name?: string;
    slug?: string;
    logoUrl?: string;
    logoBgRemoved?: boolean;
    brickNumber?: number;
    brickColor?: string;
    startingLvr?: number;
    startingPoints?: number;
}): Promise<Result<Team>> {
    const {data, error} = await supabase
        .from("teams")
        .update({
            ...(p.name !== undefined && {name: p.name}),
            ...(p.slug !== undefined && {slug: p.slug}),
            ...(p.logoUrl !== undefined && {logo_url: p.logoUrl}),
            ...(p.logoBgRemoved !== undefined && {logo_bg_removed: p.logoBgRemoved}),
            ...(p.brickNumber !== undefined && {brick_number: p.brickNumber}),
            ...(p.brickColor !== undefined && {brick_color: p.brickColor}),
            ...(p.startingLvr !== undefined && {starting_lvr: p.startingLvr}),
            ...(p.startingPoints !== undefined && {starting_points: p.startingPoints}),
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
                max_players,
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
                max_players,
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

export async function hardDeleteTeamsBySeasonId(supabase: DBClient, seasonId: string): Promise<Result<true>> {
    const {error} = await supabase
        .from("teams")
        .delete()
        .eq("season_id", seasonId)
        .eq("is_bye", false);
    if (error) return Err(serializeError(error, "DB_ERROR"));
    return Ok(true);
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

export async function unDisbandTeamById(supabase: DBClient, id: string): Promise<Result<true>> {
    const {error} = await supabase
        .from("teams")
        .update({deleted_at: null})
        .eq("id", id);
    if (error) return Err(serializeError(error, "DB_ERROR"));
    return Ok(true);
}

export async function findTeamsByIdsForMatch(supabase: DBClient, teamIds: string[]): Promise<Result<TeamWithRegionRow[]>> {
    const {data, error} = await supabase
        .from("teams")
        .select(`
            *,
            seasons!inner(
                id,
                name,
                slug,
                max_players,
                regions!inner(
                    id,
                    code,
                    name
                )
            )
        `)
        .in("id", teamIds);
    if (error) return Err(serializeError(error, "DB_ERROR"));
    return Ok((data ?? []) as unknown as TeamWithRegionRow[]);
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
                max_players,
                regions!inner(
                    id,
                    code,
                    name
                )
            ),
            player_team_seasons (
                role,
                player:players (display_name, avatar_url)
            )
        `)
        .in("id", teamIds)
        .is("deleted_at", null)
        .is("player_team_seasons.left_at", null);
    if (error) return Err(serializeError(error, "DB_ERROR"));
    return Ok((data ?? []) as unknown as TeamWithRegionRow[]);
}
