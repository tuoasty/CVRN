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
}

export interface SetPlayerPositionInput {
    playerId: string;
    teamId: string;
    seasonId: string;
    position: PositionCode | null;
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
}

import {Player, PlayerSeasonStatRow} from "@/shared/types/db";

export interface PlayerWithCurrentTeam extends Player {
    current_team: {
        team_id: string;
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

export interface PlayerDetail {
    player: PlayerWithCurrentTeam;
    seasonStats: PlayerSeasonStat[];
    awards: PlayerAward[];
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
} from "./schemas";
