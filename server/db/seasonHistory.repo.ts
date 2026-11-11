import {AwardNameRow, DBClient} from "@/shared/types/db";
import {Database} from "@/database.types";
import {Err, Ok, Result} from "@/shared/types/result";
import {serializeError} from "@/server/utils/serializeableError";
import { logger } from "../utils/logger";

type SeasonPodiumRow = Database["public"]["Tables"]["season_podium"]["Row"];
type SeasonAwardRow = Database["public"]["Tables"]["season_awards"]["Row"];
type SeasonAllStarTeamRow = Database["public"]["Tables"]["season_all_star_teams"]["Row"];

export async function findSeasonPodium(
    supabase: DBClient,
    seasonId: string
): Promise<Result<SeasonPodiumRow[]>> {
    const {data, error} = await supabase
        .from("season_podium")
        .select("*, teams(id, name, slug, logo_url)")
        .eq("season_id", seasonId)
        .order("place");
    if (error) return Err(serializeError(error, "DB_ERROR"));
    return Ok((data ?? []) as SeasonPodiumRow[]);
}

export async function upsertSeasonPodiumSlot(
    supabase: DBClient,
    p: {seasonId: string; place: number; teamId: string; isOverride: boolean; notes?: string | null}
): Promise<Result<SeasonPodiumRow>> {
    const {data, error} = await supabase
        .from("season_podium")
        .upsert(
            {
                season_id: p.seasonId,
                place: p.place,
                team_id: p.teamId,
                is_override: p.isOverride,
                notes: p.notes ?? null,
                updated_at: new Date().toISOString(),
            },
            {onConflict: "season_id,team_id"}
        )
        .select()
        .single();
    if (error) return Err(serializeError(error, "DB_ERROR"));
    return Ok(data);
}

export async function deleteSeasonPodiumSlot(
    supabase: DBClient,
    seasonId: string,
    teamId: string
): Promise<Result<true>> {
    const {error} = await supabase
        .from("season_podium")
        .delete()
        .eq("season_id", seasonId)
        .eq("team_id", teamId);
    if (error) return Err(serializeError(error, "DB_ERROR"));
    return Ok(true);
}

export async function findSeasonAwards(
    supabase: DBClient,
    seasonId: string
): Promise<Result<SeasonAwardRow[]>> {
    const {data, error} = await supabase
        .from("season_awards")
        .select("id, season_id, player_id, award_name, category, awarded_at, created_by, created_at, sort_order, full_avatar_url, avatar_bucket_path, all_star_team, all_star_slot, all_star_captain, players(id, username, player_team_seasons(season_id, teams(name)))")
        .eq("season_id", seasonId)
        .eq("players.player_team_seasons.season_id", seasonId)
        .order("sort_order");
    if (error) return Err(serializeError(error, "DB_ERROR"));
    return Ok((data ?? []) as unknown as SeasonAwardRow[]);
}

export async function findAwardNamesByCategory(
    supabase: DBClient,
    category: SeasonAwardRow["category"]
): Promise<Result<{award_name: string; created_at: string}[]>> {
    const {data, error} = await supabase
        .from("season_awards")
        .select("award_name, created_at")
        .eq("category", category)
        .order("created_at", {ascending: false});
    if (error) return Err(serializeError(error, "DB_ERROR"));
    return Ok(data ?? []);
}

export async function findAwardNames(
    supabase: DBClient
): Promise<Result<AwardNameRow[]>> {
    const {data, error} = await supabase
        .from("award_names")
        .select("*")
        .order("sort_order");
    if (error) return Err(serializeError(error, "DB_ERROR"));
    return Ok(data ?? []);
}

export async function insertAwardName(
    supabase: DBClient,
    p: {name: string; sortOrder: number}
): Promise<Result<AwardNameRow>> {
    const {data, error} = await supabase
        .from("award_names")
        .insert({name: p.name, sort_order: p.sortOrder})
        .select()
        .single();
    if (error) {
        if (error.code === "23505") return Err({message: "That award is already on the list", code: "CONFLICT"});
        return Err(serializeError(error, "DB_ERROR"));
    }
    return Ok(data);
}

export async function insertSeasonAwards(
    supabase: DBClient,
    seasonId: string,
    rows: {playerId: string; awardName: string; category: string; allStarTeam?: string; allStarSlot?: string; createdBy: string}[]
): Promise<Result<SeasonAwardRow[]>> {
    const {data: maxRow, error: maxError} = await supabase
        .from("season_awards")
        .select("sort_order")
        .eq("season_id", seasonId)
        .order("sort_order", {ascending: false})
        .limit(1)
        .maybeSingle();
    if (maxError) return Err(serializeError(maxError, "DB_ERROR"));

    const base = (maxRow?.sort_order ?? -1) + 1;
    const payload = rows.map((r, i) => ({
        season_id: seasonId,
        player_id: r.playerId,
        award_name: r.awardName,
        category: r.category as SeasonAwardRow["category"],
        all_star_team: r.allStarTeam ?? null,
        all_star_slot: r.allStarSlot ?? null,
        created_by: r.createdBy,
        sort_order: base + i,
    }));

    const {data, error} = await supabase.from("season_awards").insert(payload).select();
    if (error) return Err(serializeError(error, "DB_ERROR"));
    return Ok((data ?? []) as SeasonAwardRow[]);
}

export async function updateSeasonAwardName(
    supabase: DBClient,
    awardId: string,
    awardName: string
): Promise<Result<true>> {
    const {error} = await supabase
        .from("season_awards")
        .update({award_name: awardName})
        .eq("id", awardId);
    if (error) return Err(serializeError(error, "DB_ERROR"));
    return Ok(true);
}

export async function updateSeasonAwardPlayer(
    supabase: DBClient,
    awardId: string,
    playerId: string
): Promise<Result<true>> {
    const {error} = await supabase
        .from("season_awards")
        .update({player_id: playerId})
        .eq("id", awardId);
    if (error) return Err(serializeError(error, "DB_ERROR"));
    return Ok(true);
}

export async function updateSeasonAwardOrders(
    supabase: DBClient,
    updates: {id: string; sortOrder: number}[]
): Promise<Result<true>> {
    for (const u of updates) {
        const {error} = await supabase
            .from("season_awards")
            .update({sort_order: u.sortOrder})
            .eq("id", u.id);
        if (error) return Err(serializeError(error, "DB_ERROR"));
    }
    return Ok(true);
}

export async function insertSeasonAward(
    supabase: DBClient,
    p: {seasonId: string; playerId: string; awardName: string; category: string; createdBy: string}
): Promise<Result<SeasonAwardRow>> {
    const {data, error} = await supabase
        .from("season_awards")
        .insert({
            season_id: p.seasonId,
            player_id: p.playerId,
            award_name: p.awardName,
            category: p.category as SeasonAwardRow["category"],
            created_by: p.createdBy,
        })
        .select()
        .single();
    if (error) return Err(serializeError(error, "DB_ERROR"));
    return Ok(data);
}

export async function deleteSeasonAwardById(
    supabase: DBClient,
    awardId: string
): Promise<Result<true>> {
    const {error} = await supabase
        .from("season_awards")
        .delete()
        .eq("id", awardId);
    if (error) return Err(serializeError(error, "DB_ERROR"));
    return Ok(true);
}

export async function deleteSeasonAwardsByCategory(
    supabase: DBClient,
    seasonId: string,
    category: Database["public"]["Enums"]["award_category"]
): Promise<Result<true>> {
    const {error} = await supabase
        .from("season_awards")
        .delete()
        .eq("season_id", seasonId)
        .eq("category", category);
    if (error) return Err(serializeError(error, "DB_ERROR"));
    return Ok(true);
}

export async function findSeasonAwardBucketPath(
    supabase: DBClient,
    awardId: string
): Promise<Result<string | null>> {
    const {data, error} = await supabase
        .from("season_awards")
        .select("avatar_bucket_path")
        .eq("id", awardId)
        .maybeSingle();
    if (error) return Err(serializeError(error, "DB_ERROR"));
    return Ok(data?.avatar_bucket_path ?? null);
}

export async function findSeasonAwardPlayerRobloxId(
    supabase: DBClient,
    awardId: string
): Promise<Result<string | null>> {
    const {data, error} = await supabase
        .from("season_awards")
        .select("players(roblox_user_id)")
        .eq("id", awardId)
        .maybeSingle();
    if (error) return Err(serializeError(error, "DB_ERROR"));
    const player = data?.players as {roblox_user_id: string | number | null} | null | undefined;
    return Ok(player?.roblox_user_id != null ? String(player.roblox_user_id) : null);
}

export async function findSeasonAwardBucketPathsByCategory(
    supabase: DBClient,
    seasonId: string,
    category: Database["public"]["Enums"]["award_category"]
): Promise<Result<string[]>> {
    const {data, error} = await supabase
        .from("season_awards")
        .select("avatar_bucket_path")
        .eq("season_id", seasonId)
        .eq("category", category)
        .not("avatar_bucket_path", "is", null);
    if (error) return Err(serializeError(error, "DB_ERROR"));
    return Ok((data ?? []).map(r => r.avatar_bucket_path as string));
}

export async function findSeasonAwardBucketPathsBySeason(
    supabase: DBClient,
    seasonId: string
): Promise<Result<string[]>> {
    const {data, error} = await supabase
        .from("season_awards")
        .select("avatar_bucket_path")
        .eq("season_id", seasonId)
        .not("avatar_bucket_path", "is", null);
    if (error) return Err(serializeError(error, "DB_ERROR"));
    return Ok((data ?? []).map(r => r.avatar_bucket_path as string));
}

export async function findSeasonHistoryBySlugAndRegion(
    supabase: DBClient,
    slug: string,
    regionId: string,
): Promise<Result<unknown>> {
    const {data, error} = await supabase
        .from("seasons")
        .select(`
            id, name, slug, region_id, start_date, end_date,
            season_podium(place, is_override, notes, teams(id, name, slug, logo_url)),
            season_awards(
                id,
                award_name,
                category,
                awarded_at,
                sort_order,
                full_avatar_url,
                avatar_bucket_path,
                all_star_team,
                all_star_slot,
                all_star_captain,
                players(
                    id,
                    username,
                    display_name,
                    avatar_url,
                    player_team_seasons(
                        team_id,
                        season_id,
                        joined_at,
                        left_at,
                        teams(id, name, logo_url, brick_color)
                    )
                )
            ),
            spec_winners(
                id,
                stars_awarded,
                specs(id, name, position, stars),
                players(id, username, display_name, avatar_url)
            )
        `)
        .eq("slug", slug)
        .eq("region_id", regionId)
        .lte("season_podium.place", 3)
        .order("sort_order", {
            referencedTable: "season_awards",
            ascending: true,
        })
        .maybeSingle();

    logger.debug({error:error, data:data})
    if (error) return Err(serializeError(error, "DB_ERROR"));
    if (!data) return Err({message: "Season not found", code: "NOT_FOUND"});
    return Ok(data);
}

export async function findArchiveSeasons(
    supabase: DBClient
): Promise<Result<unknown[]>> {
    const {data, error} = await supabase
        .from("seasons")
        .select(`
            id, name, slug, region_id, start_date, end_date,
            season_podium(place, is_override, notes, teams(id, name, slug, logo_url)),
            season_awards(id, award_name, category, awarded_at, sort_order, players(id, username))
        `)
        .lte("season_podium.place", 3)
        .order("sort_order", {referencedTable: "season_awards", ascending: true})
        .order("start_date", {ascending: false});
    if (error) return Err(serializeError(error, "DB_ERROR"));
    return Ok(data ?? []);
}

export async function findSeasonAllStarTeams(
    supabase: DBClient,
    seasonId: string
): Promise<Result<SeasonAllStarTeamRow[]>> {
    const {data, error} = await supabase
        .from("season_all_star_teams")
        .select("*")
        .eq("season_id", seasonId)
        .order("code");
    if (error) return Err(serializeError(error, "DB_ERROR"));
    return Ok(data ?? []);
}

export async function upsertSeasonAllStarTeamName(
    supabase: DBClient,
    p: {seasonId: string; code: string; name: string}
): Promise<Result<SeasonAllStarTeamRow>> {
    const {data, error} = await supabase
        .from("season_all_star_teams")
        .upsert(
            {season_id: p.seasonId, code: p.code, name: p.name, updated_at: new Date().toISOString()},
            {onConflict: "season_id,code"}
        )
        .select()
        .single();
    if (error) return Err(serializeError(error, "DB_ERROR"));
    return Ok(data);
}

export async function findSeasonAwardAllStarRef(
    supabase: DBClient,
    awardId: string
): Promise<Result<{season_id: string; all_star_team: string | null; all_star_slot: string | null} | null>> {
    const {data, error} = await supabase
        .from("season_awards")
        .select("season_id, all_star_team, all_star_slot")
        .eq("id", awardId)
        .maybeSingle();
    if (error) return Err(serializeError(error, "DB_ERROR"));
    return Ok(data);
}

export async function clearAllStarCaptain(
    supabase: DBClient,
    seasonId: string,
    allStarTeam: string
): Promise<Result<true>> {
    const {error} = await supabase
        .from("season_awards")
        .update({all_star_captain: false})
        .eq("season_id", seasonId)
        .eq("all_star_team", allStarTeam)
        .eq("all_star_captain", true);
    if (error) return Err(serializeError(error, "DB_ERROR"));
    return Ok(true);
}

export async function updateAllStarCaptain(
    supabase: DBClient,
    awardId: string,
    isCaptain: boolean
): Promise<Result<true>> {
    const {error} = await supabase
        .from("season_awards")
        .update({all_star_captain: isCaptain})
        .eq("id", awardId);
    if (error) return Err(serializeError(error, "DB_ERROR"));
    return Ok(true);
}
