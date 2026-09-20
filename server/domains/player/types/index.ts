import {PositionCode} from "@/shared/volleyball/positions";

export interface RobloxUserIdInput {
    robloxUserId: string;
}

export interface SavePlayerInput {
    robloxUserId: string;
    username: string;
    displayName?: string | null;
    avatarUrl?: string | null;
}

export interface UpdatePlayerInput {
    robloxUserId: string;
    username?: string;
    displayName?: string | null;
    avatarUrl?: string | null;
    lastSyncedAt?: string;
}

export interface AddPlayerToTeamInput {
    playerId: string;
    teamId: string;
    seasonId: string;
    position?: PositionCode | null;
    height?: string | null;
}

export interface SetPlayerPositionInput {
    playerId: string;
    teamId: string;
    seasonId: string;
    position: PositionCode | null;
}

export interface SetPlayerHeightInput {
    playerId: string;
    teamId: string;
    seasonId: string;
    height: string | null;
}

export interface PlayerCurrentTeamInput {
    playerId: string;
    seasonId: string;
}

export interface PlayerWithTeamInfo {
    id: string;
    roblox_user_id: string;
    username: string | null;
    display_name: string | null;
    avatar_url: string | null;
    current_team_id: string | null;
    current_season_id: string | null;
    current_team_name: string | null;

    season_team_id?: string | null;
    season_team_name?: string | null;
}

export interface PlayerSearchHit {
    id: string;
    roblox_user_id: string;
    username: string | null;
    display_name: string | null;
    avatar_url: string | null;
    region_code: string | null;
    region_name: string | null;
    team: {
        id: string;
        name: string;
        logo_url: string | null;
        logo_bg_removed: boolean;
        brick_color: string | null;
        season_name: string;
        joined_at: string;
    } | null;
}

export interface RosterSpec {
    name: string;
    position: string;
    stars: number;
    starsAwarded: number;
    dropped: boolean;
}

export interface PlayerWithRole {
    id: string;
    roblox_user_id: string;
    username: string | null;
    display_name: string | null;
    avatar_url: string | null;
    last_synced_at: string | null;
    created_at: string;
    role: "captain" | "vice_captain" | "court_captain" | "player";
    current_position: PositionCode | null;
    spec: RosterSpec | null;
}

import {Player, PlayerSeasonStatRow} from "@/shared/types/db";

export interface PlayerWithCurrentTeam extends Player {
    current_team: {
        team_id: string;
        season_id: string;
        team_name: string;
        team_logo_url: string | null;
        team_logo_bg_removed: boolean;
        team_brick_color: string | null;
        season_name: string;
        region_code: string;
        region_name: string;
    } | null;
    current_position: PositionCode | null;
}

export interface PlayerSeasonStat extends PlayerSeasonStatRow {
    season_id: string;
    season_name: string;
    season_slug: string;
    region_code: string;
}

export interface PlayerLeaderboardRow extends PlayerSeasonStat {
    player_id: string;
    username: string;
    display_name: string | null;
    avatar_url: string | null;
    region_id: string;

    season_start_date: string;
    team_id: string | null;
    team_name: string | null;
    team_slug: string | null;
    team_logo_url: string | null;
    team_logo_bg_removed: boolean | null;
}

export interface AllTimeLeaderboardRow extends Omit<PlayerLeaderboardRow, "season_id" | "season_name"> {
    season_id: null;
    season_name: null;
    seasons_played: number;
}

export type LeaderboardDisplayRow = PlayerLeaderboardRow | AllTimeLeaderboardRow;

export type LeaderboardIdentityFields =
    | "username"
    | "display_name"
    | "avatar_url"
    | "season_name"
    | "season_slug"
    | "season_start_date"
    | "region_code"
    | "team_name"
    | "team_slug"
    | "team_logo_url"
    | "team_logo_bg_removed";

export type LeaderboardStatRow = Omit<PlayerLeaderboardRow, LeaderboardIdentityFields>;

export interface LeaderboardIdentity {
    players: Record<string, {username: string; display_name: string | null; avatar_url: string | null}>;
    teams: Record<string, {name: string; slug: string; logo_url: string | null; logo_bg_removed: boolean}>;
    seasons: Record<string, {name: string; slug: string; start_date: string; region_code: string}>;
}

export interface PlayerAward {
    id: string;
    award_name: string;
    category: string;
    season_id: string;
    season_name: string;
    season_slug: string;
    region_code: string;
    team_name: string | null;
    team_slug: string | null;
    team_disbanded: boolean;
    awarded_at: string | null;
    team_logo_url: string | null;
    team_logo_bg_removed: boolean;
    place?: number;
    place_end?: number;
}

export interface PlayerTeamHistoryEntry {
    team_id: string;
    team_name: string;
    team_slug: string;
    team_logo_url: string | null;
    team_logo_bg_removed: boolean;
    team_brick_color: string | null;
    team_disbanded: boolean;
    season_id: string;
    season_name: string;
    region_code: string;
    season_slug: string;
    league_type: "main" | "side";
    role: "captain" | "vice_captain" | "court_captain" | "player";
    position: PositionCode | null;
    joined_at: string;
    left_at: string | null;
    season_end_date: string | null;
}

export interface PlayerSpecEntry {
    id: string;
    spec_name: string;
    position: string;
    stars: number;
    stars_awarded: number;
    dropped: boolean;
    season_id: string;
    season_name: string;
    season_slug: string;
    region_code: string;
    awarded_at: string | null;
    team_name: string | null;
    team_slug: string | null;
    team_disbanded: boolean;
    team_logo_url: string | null;
    team_logo_bg_removed: boolean;
}

export interface PlayerRawStatTotalsRow {
    sets_played: number;
    ape_kills: number;
    ape_attempts: number;
    delay_kills: number;
    quick_kills: number;
    wipes_tools: number;
    kill_attempts: number;
    spiking_errors: number;
    assists: number;
    setting_errors: number;
    kill_blocks: number;
    block_touches: number;
    digs: number;
    block_follows: number;
    dives: number;
    receive_errors: number;
    receives: number;
    jump_serve_aces: number;
    float_aces: number;
    service_errors: number;
}

export interface PlayerRawStatsResponse {
    roblox_user_id: string;
    sets_played: number;
    spiking: {
        ape_kills: number;
        ape_attempts: number;
        delay_kills: number;
        quick_kills: number;
        wipes_tools: number;
        kill_attempts: number;
        spiking_errors: number;
    };
    setting: {
        assists: number;
        setting_errors: number;
    };
    blocking: {
        kill_blocks: number;
        block_touches: number;
    };
    receiving: {
        receives: number;
        digs: number;
        block_follows: number;
        dives: number;
        receive_errors: number;
    };
    serving: {
        jump_serve_aces: number;
        float_aces: number;
        service_errors: number;
    };
}

export interface PlayerStatRanksRow {
    points_per_set: number | null;
    kills_per_set: number | null;
    assists_per_set: number | null;
    blocks_per_set: number | null;
    receives_per_set: number | null;
    aces_per_set: number | null;
    points_per_set_rank: number | null;
    kills_per_set_rank: number | null;
    hit_pct_rank: number | null;
    assists_per_set_rank: number | null;
    set_pct_rank: number | null;
    blocks_per_set_rank: number | null;
    kb_pct_rank: number | null;
    receives_per_set_rank: number | null;
    rec_pct_rank: number | null;
    aces_per_set_rank: number | null;
}

export interface PlayerStatsResponse {
    roblox_user_id: string;
    sets_played: number;
    points_per_set: number | null;
    points_per_set_rank: number | null;
    spiking: {
        ape_kills: number;
        ape_attempts: number;
        delay_kills: number;
        quick_kills: number;
        wipes_tools: number;
        kill_attempts: number;
        spiking_errors: number;
        kills_per_set: number | null;
        kills_per_set_rank: number | null;
        hit_pct_rank: number | null;
    };
    setting: {
        assists: number;
        setting_errors: number;
        assists_per_set: number | null;
        assists_per_set_rank: number | null;
        set_pct_rank: number | null;
    };
    blocking: {
        kill_blocks: number;
        block_touches: number;
        blocks_per_set: number | null;
        blocks_per_set_rank: number | null;
        kb_pct_rank: number | null;
    };
    receiving: {
        receives: number;
        digs: number;
        block_follows: number;
        dives: number;
        receive_errors: number;
        receives_per_set: number | null;
        receives_per_set_rank: number | null;
        rec_pct_rank: number | null;
    };
    serving: {
        jump_serve_aces: number;
        float_aces: number;
        service_errors: number;
        aces_per_set: number | null;
        aces_per_set_rank: number | null;
    };
}

export interface PlayerAchievement {
    season_id: string;
    season_name: string;
    season_slug: string;
    place: number;
    place_end: number;
    team_id: string;
    team_name: string;
    team_slug: string;
    is_captain: boolean;
}

export interface PlayerDetailAward {
    award_name: string;
    category: string;
    season_id: string;
    season_name: string;
}

export interface PlayerDetailSpecAward {
    name: string;
    position: string;
    stars: number;
    season_id: string;
    season_name: string;
}

export interface PlayerDetailApiResponse {
    achievements: PlayerAchievement[];
    awards: PlayerDetailAward[];
    spec_awards: PlayerDetailSpecAward[];
}

interface StatSummaryTriplet {
    min: number;
    max: number;
    mean: number;
}

interface QualifiedStatSummaryTriplet {
    min: number | null;
    max: number | null;
    mean: number | null;
}

export interface RawStatSummaryRow {
    sets_played_min: number; sets_played_max: number; sets_played_mean: number;
    ape_kills_min: number; ape_kills_max: number; ape_kills_mean: number;
    ape_attempts_min: number; ape_attempts_max: number; ape_attempts_mean: number;
    delay_kills_min: number; delay_kills_max: number; delay_kills_mean: number;
    quick_kills_min: number; quick_kills_max: number; quick_kills_mean: number;
    wipes_tools_min: number; wipes_tools_max: number; wipes_tools_mean: number;
    kill_attempts_min: number; kill_attempts_max: number; kill_attempts_mean: number;
    spiking_errors_min: number; spiking_errors_max: number; spiking_errors_mean: number;
    assists_min: number; assists_max: number; assists_mean: number;
    setting_errors_min: number; setting_errors_max: number; setting_errors_mean: number;
    kill_blocks_min: number; kill_blocks_max: number; kill_blocks_mean: number;
    block_touches_min: number; block_touches_max: number; block_touches_mean: number;
    receives_min: number; receives_max: number; receives_mean: number;
    digs_min: number; digs_max: number; digs_mean: number;
    block_follows_min: number; block_follows_max: number; block_follows_mean: number;
    dives_min: number; dives_max: number; dives_mean: number;
    receive_errors_min: number; receive_errors_max: number; receive_errors_mean: number;
    jump_serve_aces_min: number; jump_serve_aces_max: number; jump_serve_aces_mean: number;
    float_aces_min: number; float_aces_max: number; float_aces_mean: number;
    service_errors_min: number; service_errors_max: number; service_errors_mean: number;

    points_per_set_min: number | null; points_per_set_max: number | null; points_per_set_mean: number | null;
    kills_per_set_min: number | null; kills_per_set_max: number | null; kills_per_set_mean: number | null;
    hit_pct_min: number | null; hit_pct_max: number | null; hit_pct_mean: number | null;
    assists_per_set_min: number | null; assists_per_set_max: number | null; assists_per_set_mean: number | null;
    set_pct_min: number | null; set_pct_max: number | null; set_pct_mean: number | null;
    blocks_per_set_min: number | null; blocks_per_set_max: number | null; blocks_per_set_mean: number | null;
    kb_pct_min: number | null; kb_pct_max: number | null; kb_pct_mean: number | null;
    receives_per_set_min: number | null; receives_per_set_max: number | null; receives_per_set_mean: number | null;
    rec_pct_min: number | null; rec_pct_max: number | null; rec_pct_mean: number | null;
    aces_per_set_min: number | null; aces_per_set_max: number | null; aces_per_set_mean: number | null;
}

export interface RawStatSummaryResponse {
    sets_played: StatSummaryTriplet;
    points_per_set: QualifiedStatSummaryTriplet;
    spiking: {
        ape_kills: StatSummaryTriplet;
        ape_attempts: StatSummaryTriplet;
        delay_kills: StatSummaryTriplet;
        quick_kills: StatSummaryTriplet;
        wipes_tools: StatSummaryTriplet;
        kill_attempts: StatSummaryTriplet;
        spiking_errors: StatSummaryTriplet;
        kills_per_set: QualifiedStatSummaryTriplet;
        hit_pct: QualifiedStatSummaryTriplet;
    };
    setting: {
        assists: StatSummaryTriplet;
        setting_errors: StatSummaryTriplet;
        assists_per_set: QualifiedStatSummaryTriplet;
        set_pct: QualifiedStatSummaryTriplet;
    };
    blocking: {
        kill_blocks: StatSummaryTriplet;
        block_touches: StatSummaryTriplet;
        blocks_per_set: QualifiedStatSummaryTriplet;
        kb_pct: QualifiedStatSummaryTriplet;
    };
    receiving: {
        receives: StatSummaryTriplet;
        digs: StatSummaryTriplet;
        block_follows: StatSummaryTriplet;
        dives: StatSummaryTriplet;
        receive_errors: StatSummaryTriplet;
        receives_per_set: QualifiedStatSummaryTriplet;
        rec_pct: QualifiedStatSummaryTriplet;
    };
    serving: {
        jump_serve_aces: StatSummaryTriplet;
        float_aces: StatSummaryTriplet;
        service_errors: StatSummaryTriplet;
        aces_per_set: QualifiedStatSummaryTriplet;
    };
}

export interface PlayerDetail {
    player: PlayerWithCurrentTeam;
    seasonStats: PlayerSeasonStat[];
    awards: PlayerAward[];
    specs: PlayerSpecEntry[];
    activeSpec: PlayerSpecEntry | null;
    teamHistory: PlayerTeamHistoryEntry[];
}

export type {
    PlayerRole,
    SavePlayerToTeamInput,
    RemovePlayerFromTeamInput,
    TeamPlayersInput,
    PlayersByIdsInput,
    SearchPlayersInput,
    AddExistingPlayerToTeamInput,
    SetPlayerRoleInput,
    TransferCaptainInput,
    PlayerLeaderboardInput,
    RangedLeaderboardInput,
    RobloxIdParamInput,
    SeasonQueryInput,
} from "./schemas";

export {
    PlayerRoleSchema,
    SavePlayerToTeamSchema,
    RemovePlayerFromTeamSchema,
    TeamPlayersSchema,
    PlayersByIdsSchema,
    SearchPlayersSchema,
    AddExistingPlayerToTeamSchema,
    SetPlayerRoleSchema,
    TransferCaptainSchema,
    PlayerLeaderboardSchema,
    RangedLeaderboardSchema,
    RobloxIdParamSchema,
    SeasonQuerySchema,
} from "./schemas";
