import {DBClient, PickemMarketRow, PickemOutcomeRow, PickemSettingsRow} from "@/shared/types/db";
import {Err, Ok, Result} from "@/shared/types/result";
import {serializeError} from "@/server/utils/serializeableError";
import type {
    PickemMarketDraft,
    PickemMatchSource,
    PickemOddsSource,
    PickemTeamView,
} from "@/server/domains/pickem/types";

const MATCH_SELECT = `
    id, match_code, match_type, status, week, best_of, scheduled_at,
    home:teams!matches_home_team_id_fkey (id, name, logo_url),
    away:teams!matches_away_team_id_fkey (id, name, logo_url)
`;

type TeamEmbed = {id: string; name: string; logo_url: string | null} | null;

type MatchQueryRow = {
    id: string;
    match_code: string | null;
    match_type: "season" | "playoffs";
    status: "pending" | "scheduled" | "completed";
    week: number | null;
    best_of: number;
    scheduled_at: string | null;
    home: TeamEmbed;
    away: TeamEmbed;
};

function toTeam(team: TeamEmbed): PickemTeamView | null {
    return team ? {id: team.id, name: team.name, logoUrl: team.logo_url} : null;
}

function toMatchSource(row: MatchQueryRow): PickemMatchSource {
    return {
        id: row.id,
        matchCode: row.match_code,
        matchType: row.match_type,
        status: row.status,
        week: row.week,
        bestOf: row.best_of,
        scheduledAt: row.scheduled_at,
        home: toTeam(row.home),
        away: toTeam(row.away),
    };
}

export async function findPickemSettingsRow(supabase: DBClient): Promise<Result<PickemSettingsRow>> {
    const {data, error} = await supabase.from("pickem_settings").select("*").eq("id", true).single();
    if (error) return Err(serializeError(error, "DB_ERROR"));
    return Ok(data);
}

export async function updatePickemSettingsRow(
    supabase: DBClient,
    patch: Pick<PickemSettingsRow, "seed" | "rake" | "odds_floor" | "sigma" | "shrink_sets" | "prob_clamp" | "stake_min" | "stake_max" | "updated_by">,
): Promise<Result<PickemSettingsRow>> {
    const {data, error} = await supabase
        .from("pickem_settings")
        .update({...patch, updated_at: new Date().toISOString()})
        .eq("id", true)
        .select("*")
        .single();
    if (error) return Err(serializeError(error, "DB_ERROR"));
    return Ok(data);
}

export async function findPickemMatchesBySeason(supabase: DBClient, seasonId: string): Promise<Result<PickemMatchSource[]>> {
    const {data, error} = await supabase.from("matches").select(MATCH_SELECT).eq("season_id", seasonId);
    if (error) return Err(serializeError(error, "DB_ERROR"));
    return Ok(((data ?? []) as unknown as MatchQueryRow[]).map(toMatchSource));
}

export async function findPickemMatchesByIds(supabase: DBClient, matchIds: string[]): Promise<Result<(PickemMatchSource & {seasonId: string})[]>> {
    if (matchIds.length === 0) return Ok([]);
    const {data, error} = await supabase.from("matches").select(`season_id, ${MATCH_SELECT}`).in("id", matchIds);
    if (error) return Err(serializeError(error, "DB_ERROR"));
    return Ok(((data ?? []) as unknown as (MatchQueryRow & {season_id: string})[]).map(row => ({...toMatchSource(row), seasonId: row.season_id})));
}

export async function findPickemMarketsByMatchIds(supabase: DBClient, matchIds: string[]): Promise<Result<PickemMarketRow[]>> {
    if (matchIds.length === 0) return Ok([]);
    const {data, error} = await supabase.from("pickem_markets").select("*").in("match_id", matchIds);
    if (error) return Err(serializeError(error, "DB_ERROR"));
    return Ok(data ?? []);
}

export async function findPickemOutcomesByMarketIds(supabase: DBClient, marketIds: string[]): Promise<Result<PickemOutcomeRow[]>> {
    if (marketIds.length === 0) return Ok([]);
    const {data, error} = await supabase.from("pickem_outcomes").select("*").in("market_id", marketIds);
    if (error) return Err(serializeError(error, "DB_ERROR"));
    return Ok(data ?? []);
}

export async function rpcPickemMarketOdds(supabase: DBClient, marketIds: string[]): Promise<Result<PickemOddsSource[]>> {
    if (marketIds.length === 0) return Ok([]);
    const {data, error} = await supabase.rpc("pickem_market_odds", {p_market_ids: marketIds});
    if (error) return Err(serializeError(error, "DB_ERROR"));
    return Ok((data ?? []).map(row => ({
        marketId: row.market_id,
        outcomeKey: row.outcome_key,
        staked: Number(row.staked),
        pool: Number(row.pool),
        odds: Number(row.odds),
    })));
}

export async function rpcPublishPickemMarkets(supabase: DBClient, drafts: PickemMarketDraft[]): Promise<Result<string[]>> {
    const payload = drafts.map(d => ({
        match_id: d.matchId,
        kind: d.kind,
        outcomes: d.outcomes.map(o => ({key: o.key, label: o.label, start_prob: o.startProb})),
    }));
    const {data, error} = await supabase.rpc("publish_pickem_markets", {p_markets: payload});
    if (error?.code === "23505") return Err({message: "One of these matches was already published. Refresh and try again.", code: "CONFLICT"});
    if (error) return Err(serializeError(error, "DB_ERROR"));
    return Ok((data ?? []) as string[]);
}
