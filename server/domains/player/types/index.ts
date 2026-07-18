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
    /** Only populated by searchPlayersInDatabase when a seasonId is supplied. */
    season_team_id?: string | null;
    season_team_name?: string | null;
}

/**
 * Result row for the public player search page. Region is always populated from the
 * player's most-recent stint (any league); `team` is only their most-recent *active
 * main-league* team, and is null when they have none.
 */
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
}

export interface PlayerSeasonStat extends PlayerSeasonStatRow {
    season_id: string;
    season_name: string;
    season_slug: string;
    region_code: string;
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
} from "./schemas";
