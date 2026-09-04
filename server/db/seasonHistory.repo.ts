import {DBClient} from "@/shared/types/db";
import {Database} from "@/database.types";
import {Err, Ok, Result} from "@/shared/types/result";
import {serializeError} from "@/server/utils/serializeableError";
import { logger } from "../utils/logger";

type SeasonPodiumRow = Database["public"]["Tables"]["season_podium"]["Row"];
type SeasonAwardRow = Database["public"]["Tables"]["season_awards"]["Row"];

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
        .select("id, season_id, player_id, award_name, category, awarded_at, created_by, created_at, full_avatar_url, avatar_bucket_path, players(id, username)")
        .eq("season_id", seasonId)
        .order("awarded_at");
    if (error) return Err(serializeError(error, "DB_ERROR"));
    return Ok((data ?? []) as unknown as SeasonAwardRow[]);
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
            category: p.category as "individual_winners" | "first_team" | "staff_team",
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
                full_avatar_url,
                avatar_bucket_path,
                players(
                    id,
                    username,
                    display_name,
                    player_team_seasons(
                        team_id,
                        season_id,
                        teams(id, name, logo_url, brick_color)
                    )
                )
            )
        `)
        .eq("slug", slug)
        .eq("region_id", regionId)
        .lte("season_podium.place", 3)
        .order("created_at", {
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
            season_awards(id, award_name, category, awarded_at, players(id, username))
        `)
        .lte("season_podium.place", 3)
        .order("start_date", {ascending: false});
    if (error) return Err(serializeError(error, "DB_ERROR"));
    return Ok(data ?? []);
}
