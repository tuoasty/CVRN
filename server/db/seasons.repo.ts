import {DBClient, Season} from "@/shared/types/db";
import {InsertSeasonDto, UpdateSeasonInput} from "@/server/domains/season";
import {Database} from "@/database.types";
import {Err, Ok, Result} from "@/shared/types/result";
import {serializeError} from "@/server/utils/serializeableError";
import { compareSeasons } from "../domains/season/helpers/compareSeasons";

type SeasonWithPlayoffConfig = Database["public"]["Tables"]["seasons"]["Row"] & {
    playoff_configs: Database["public"]["Tables"]["playoff_configs"]["Row"] | null;
};

export async function insertSeason(supabase: DBClient, p: InsertSeasonDto): Promise<Result<Season>> {
    const {data, error} = await supabase
        .from("seasons")
        .insert({
            ...(p.id && {id: p.id}),
            name: p.name,
            region_id: p.regionId,
            start_date: p.startDate,
            max_players: p.maxPlayers,
            end_date: p.endDate,
            slug: p.slug,
            season_number: p.seasonNumber,
            league_type: p.leagueType,
            theme: p.theme ?? null,
            playoff_config_id: p.playoffConfigId ?? null,
        })
        .select()
        .single();
    if (error) return Err(serializeError(error, "DB_ERROR"));
    return Ok(data);
}

export async function findAllSeasons(supabase: DBClient): Promise<Result<SeasonWithPlayoffConfig[]>> {
    const {data, error} = await supabase
        .from("seasons")
        .select("*, playoff_configs(*)")
    if (error) return Err(serializeError(error, "DB_ERROR"));
    const sorted = (data ?? []).sort(compareSeasons)
    return Ok(sorted as SeasonWithPlayoffConfig[]);
}

export async function findHeldSpecSeasonId(
    supabase: DBClient,
    currentSeasonId: string
): Promise<Result<string | null>> {
    const {data: current, error: currentError} = await supabase
        .from("seasons")
        .select("start_date, region_id")
        .eq("id", currentSeasonId)
        .maybeSingle();
    if (currentError) return Err(serializeError(currentError, "DB_ERROR"));
    if (!current) return Ok(null);

    const {data, error} = await supabase
        .from("seasons")
        .select("id")
        .eq("region_id", current.region_id)
        .eq("league_type", "main")
        .lt("start_date", current.start_date)
        .not("end_date", "is", null)
        .lt("end_date", new Date().toISOString())
        .order("start_date", {ascending: false})
        .limit(1)
        .maybeSingle();
    if (error) return Err(serializeError(error, "DB_ERROR"));
    return Ok(data?.id ?? null);
}

export async function findSeasonById(supabase: DBClient, seasonId: string): Promise<Result<Season | null>> {
    const {data, error} = await supabase
        .from("seasons")
        .select("*")
        .eq("id", seasonId)
        .single();
    if (error) {
        if (error.code === "PGRST116") return Ok(null);
        return Err(serializeError(error, "DB_ERROR"));
    }
    return Ok(data);
}

export async function findSeasonsByRegion(supabase: DBClient, regionId: string): Promise<Result<Season[]>> {
    const {data, error} = await supabase
        .from("seasons")
        .select("*")
        .eq("region_id", regionId)
    if (error) return Err(serializeError(error, "DB_ERROR"));
    const sorted = (data ?? []).sort(compareSeasons)
    return Ok(sorted);
}

export async function updateSeasonById(
    supabase: DBClient,
    seasonId: string,
    updates: Omit<UpdateSeasonInput, "seasonId">
): Promise<Result<Season>> {
    const payload: Record<string, unknown> = {};

    if (updates.name !== undefined) payload.name = updates.name;
    if (updates.startDate !== undefined) payload.start_date = updates.startDate;
    if (updates.endDate !== undefined) payload.end_date = updates.endDate;
    if (updates.slug !== undefined) payload.slug = updates.slug;
    if (updates.seasonNumber !== undefined) payload.season_number = updates.seasonNumber;
    if (updates.theme !== undefined) payload.theme = updates.theme;
    if (updates.maxPlayers !== undefined) payload.max_players = updates.maxPlayers;
    if (updates.leagueType !== undefined) payload.league_type = updates.leagueType;
    if (updates.playoffConfigId !== undefined) payload.playoff_config_id = updates.playoffConfigId;

    const {data, error} = await supabase
        .from("seasons")
        .update(payload)
        .eq("id", seasonId)
        .select()
        .single();
    if (error) return Err(serializeError(error, "DB_ERROR"));
    return Ok(data);
}

export async function deleteSeasonById(supabase: DBClient, seasonId: string): Promise<Result<true>> {
    const {error} = await supabase
        .from("seasons")
        .delete()
        .eq("id", seasonId);
    if (error) return Err(serializeError(error, "DB_ERROR"));
    return Ok(true);
}

export async function findSeasonsBySeasonNumber(
    supabase: DBClient,
    seasonNumber: number
): Promise<Result<Array<Season & {region_code: string}>>> {
    const {data, error} = await supabase
        .from("seasons")
        .select("*, regions!inner(code)")
        .eq("season_number", seasonNumber);
    if (error) return Err(serializeError(error, "DB_ERROR"));
    return Ok((data ?? []).map(r => ({
        ...r,
        region_code: (r.regions as {code: string}).code,
    })));
}

export async function findSeasonBySlugAndRegion(
    supabase: DBClient,
    slug: string,
    regionId: string
): Promise<Result<SeasonWithPlayoffConfig | null>> {
    const {data, error} = await supabase
        .from("seasons")
        .select("*, playoff_configs(*)")
        .eq("slug", slug)
        .eq("region_id", regionId)
        .single();
    if (error) {
        if (error.code === "PGRST116") return Ok(null);
        return Err(serializeError(error, "DB_ERROR"));
    }
    return Ok(data as SeasonWithPlayoffConfig);
}
