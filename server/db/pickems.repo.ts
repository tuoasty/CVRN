import {DBClient, PickemMarketRow, PickemOutcomeRow, PickemPickRow, PickemSettingsRow} from "@/shared/types/db";
import type {PickemDetailPickSource} from "@/server/domains/pickem/types";
import {Err, Ok, Result} from "@/shared/types/result";
import {serializeError} from "@/server/utils/serializeableError";
import type {
    PickemMarketDraft,
    PickemMatchSource,
    PickemActivityCursor,
    PickemActivityRowSource,
    PickemActivitySource,
    PickemOddsSource,
    PickemSettleRowSource,
    PickemTeamView,
} from "@/server/domains/pickem/types";
import {PICK_ERROR_CODES, type PickErrorCode, type PlacePickBody} from "@/server/domains/pickem/types/gameSchemas";
import type {OpenPickemMatch, PlayerPickSource} from "@/server/domains/pickem/helpers/toOpenPickems";

const MATCH_SELECT = `
    id, match_code, match_type, status, week, best_of, scheduled_at, home_sets_won, away_sets_won, is_forfeit,
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
    home_sets_won: number | null;
    away_sets_won: number | null;
    is_forfeit: boolean | null;
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
        result: row.status === "completed"
            ? {homeSets: row.home_sets_won ?? 0, awaySets: row.away_sets_won ?? 0, forfeit: row.is_forfeit ?? false}
            : null,
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

export async function findOpenPickemMarketRows(supabase: DBClient): Promise<Result<PickemMarketRow[]>> {
    const {data, error} = await supabase.from("pickem_markets").select("*").eq("status", "open");
    if (error) return Err(serializeError(error, "DB_ERROR"));
    return Ok(data ?? []);
}

type RegionEmbed = {season_number: number; regions: {code: string} | null} | null;

export async function findOpenPickemMatchesByIds(supabase: DBClient, matchIds: string[]): Promise<Result<OpenPickemMatch[]>> {
    if (matchIds.length === 0) return Ok([]);
    const {data, error} = await supabase
        .from("matches")
        .select(`${MATCH_SELECT}, seasons (season_number, regions (code))`)
        .in("id", matchIds);
    if (error) return Err(serializeError(error, "DB_ERROR"));
    return Ok(((data ?? []) as unknown as (MatchQueryRow & {seasons: RegionEmbed})[]).map(row => ({
        ...toMatchSource(row),
        region: row.seasons?.regions?.code ?? null,
        seasonNumber: row.seasons?.season_number ?? null,
    })));
}

export async function findPlayerPicksByMarketIds(supabase: DBClient, robloxUserId: string, marketIds: string[]): Promise<Result<PlayerPickSource[]>> {
    if (marketIds.length === 0) return Ok([]);
    const {data, error} = await supabase
        .from("pickem_picks")
        .select("id, market_id, outcome_key, stake")
        .eq("roblox_user_id", robloxUserId)
        .in("market_id", marketIds);
    if (error) return Err(serializeError(error, "DB_ERROR"));
    return Ok((data ?? []).map(row => ({id: row.id, marketId: row.market_id, outcomeKey: row.outcome_key, stake: row.stake})));
}

export type PlacedPick = {pickId: string; outcomeKey: string; stake: number; charged: number; replayed: boolean};
export type PickFailure = {code: PickErrorCode | "DB_ERROR"; message: string};

export async function rpcPlacePickemPick(
    supabase: DBClient,
    body: PlacePickBody,
): Promise<{ok: true; value: PlacedPick} | {ok: false; error: PickFailure}> {
    const {data, error} = await supabase.rpc("place_pickem_pick", {
        p_request_id: body.request_id,
        p_roblox_user_id: body.roblox_user_id,
        p_market_id: body.market_id,
        p_outcome_key: body.outcome,
        p_stake: body.stake,
    });
    if (error) {
        const code = (PICK_ERROR_CODES as readonly string[]).includes(error.hint ?? "") ? error.hint as PickErrorCode : "DB_ERROR";
        return {ok: false, error: {code, message: code === "DB_ERROR" ? "Failed to save the pick" : error.message}};
    }
    const row = data?.[0];
    if (!row) return {ok: false, error: {code: "DB_ERROR", message: "Failed to save the pick"}};
    return {ok: true, value: {pickId: row.pick_id, outcomeKey: row.outcome_key, stake: row.stake, charged: row.charged, replayed: row.replayed}};
}

export async function findPickemMarketRowById(supabase: DBClient, marketId: string): Promise<Result<PickemMarketRow | null>> {
    const {data, error} = await supabase.from("pickem_markets").select("*").eq("id", marketId).maybeSingle();
    if (error) return Err(serializeError(error, "DB_ERROR"));
    return Ok(data);
}

export async function rpcSettlePickemMatches(supabase: DBClient, matchIds: string[], dryRun: boolean): Promise<Result<PickemSettleRowSource[]>> {
    const {data, error} = await supabase.rpc("settle_pickem_matches", {p_match_ids: matchIds, p_dry_run: dryRun});
    if (error?.code === "42501") return Err({message: error.message, code: "FORBIDDEN"});
    if (error) return Err(serializeError(error, "DB_ERROR"));
    return Ok((data ?? []).map(row => ({
        matchId: row.match_id,
        marketId: row.market_id,
        kind: row.kind,
        outcomeKey: row.outcome_key,
        result: row.result as PickemSettleRowSource["result"],
        forfeit: row.forfeit,
        picks: row.picks,
        staked: Number(row.staked),
        finalOdds: row.final_odds === null ? null : Number(row.final_odds),
        payout: Number(row.payout),
    })));
}

export type RefundedMarket = {marketId: string; picks: number; refunded: number};

export async function rpcRefundPickemMarkets(supabase: DBClient, marketIds: string[]): Promise<Result<RefundedMarket[]>> {
    const {data, error} = await supabase.rpc("refund_pickem_markets", {p_market_ids: marketIds});
    if (error?.code === "42501") return Err({message: error.message, code: "FORBIDDEN"});
    if (error) return Err(serializeError(error, "DB_ERROR"));
    return Ok((data ?? []).map(row => ({marketId: row.market_id, picks: row.picks, refunded: Number(row.refunded)})));
}

export async function findPickemMarketRowsByIds(supabase: DBClient, marketIds: string[]): Promise<Result<PickemMarketRow[]>> {
    if (marketIds.length === 0) return Ok([]);
    const {data, error} = await supabase.from("pickem_markets").select("*").in("id", marketIds);
    if (error) return Err(serializeError(error, "DB_ERROR"));
    return Ok(data ?? []);
}

export type UnclaimedPick = Pick<PickemPickRow, "id" | "market_id" | "outcome_key" | "stake" | "updated_at"> & {payout: number};

export async function findUnclaimedPicks(supabase: DBClient, robloxUserId: string, limit: number): Promise<Result<UnclaimedPick[]>> {
    const {data, error} = await supabase
        .from("pickem_picks")
        .select("id, market_id, outcome_key, stake, payout, updated_at")
        .eq("roblox_user_id", robloxUserId)
        .not("payout", "is", null)
        .is("claimed_at", null)
        .order("updated_at", {ascending: true})
        .order("id", {ascending: true})
        .limit(limit);
    if (error) return Err(serializeError(error, "DB_ERROR"));
    return Ok((data ?? []).map(row => ({...row, payout: row.payout ?? 0})));
}

export async function markPicksClaimed(supabase: DBClient, robloxUserId: string, pickIds: string[]): Promise<Result<string[]>> {
    const {data, error} = await supabase
        .from("pickem_picks")
        .update({claimed_at: new Date().toISOString()})
        .eq("roblox_user_id", robloxUserId)
        .in("id", pickIds)
        .not("payout", "is", null)
        .is("claimed_at", null)
        .select("id");
    if (error) return Err(serializeError(error, "DB_ERROR"));
    return Ok((data ?? []).map(row => row.id));
}

export async function findPicksByMarketIds(supabase: DBClient, marketIds: string[]): Promise<Result<PickemDetailPickSource[]>> {
    if (marketIds.length === 0) return Ok([]);
    const {data, error} = await supabase
        .from("pickem_picks")
        .select("id, market_id, roblox_user_id, outcome_key, stake, payout, claimed_at, updated_at")
        .in("market_id", marketIds);
    if (error) return Err(serializeError(error, "DB_ERROR"));
    return Ok((data ?? []).map(row => ({
        id: row.id,
        marketId: row.market_id,
        robloxUserId: row.roblox_user_id,
        outcomeKey: row.outcome_key,
        stake: row.stake,
        payout: row.payout,
        claimedAt: row.claimed_at,
        updatedAt: row.updated_at,
    })));
}

export async function rpcPickemActivity(
    supabase: DBClient,
    p: {seasonId: string; source: PickemActivitySource; before: PickemActivityCursor | undefined; limit: number},
): Promise<Result<PickemActivityRowSource[]>> {
    const {data, error} = await supabase.rpc("pickem_activity", {
        p_season_id: p.seasonId,
        p_source: p.source,
        p_before_at: p.before?.at ?? undefined,
        p_before_source: p.before?.source ?? undefined,
        p_before_id: p.before?.id ?? undefined,
        p_limit: p.limit,
    });
    if (error) return Err(serializeError(error, "DB_ERROR"));
    return Ok((data ?? []).map(row => ({
        source: row.source === "game" ? "game" : "admin",
        id: Number(row.id),
        createdAt: row.created_at,
        action: row.action,
        actionOutcome: row.action_outcome,
        actorName: row.actor_name,
        target: (row.target ?? null) as Record<string, unknown> | null,
        eventKind: row.event_kind,
        matchId: row.match_id,
        marketKind: row.market_kind,
        robloxUserId: row.roblox_user_id,
        outcomeKey: row.outcome_key,
        previousOutcomeKey: row.previous_outcome_key,
        stake: row.stake,
        previousStake: row.previous_stake,
        charged: row.charged,
        payout: row.payout,
    })));
}
