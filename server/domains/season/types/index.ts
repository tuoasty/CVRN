import {PlayoffConfig, Season} from "@/shared/types/db";

export interface CreateSeasonInput {
    name: string;
    regionId: string;
    startDate: string;
    endDate?: string | null;
    maxPlayers: number;
    slug: string;
    leagueType?: 'main' | 'side';
    theme?: string | null;
    playoffConfigId?: string | null;
}

export interface UpdateSeasonInput {
    seasonId: string;
    name?: string;
    startDate?: string;
    endDate?: string | null;
    maxPlayers?: number;
    slug?: string;
    leagueType?: 'main' | 'side';
    theme?: string | null;
    playoffConfigId?: string | null;
}

export interface InsertSeasonDto {
    id?: string;
    name: string;
    regionId: string;
    startDate: string;
    slug: string;
    leagueType?: 'main' | 'side';
    theme?: string | null;
    endDate?: string | null;
    maxPlayers: number;
    playoffConfigId?: string | null;
}

export interface SeasonWithPlayoffConfig extends Season {
    playoff_configs: PlayoffConfig | null;
}

export interface SeasonPodiumEntryWithTeam {
    id: string;
    season_id: string;
    team_id: string;
    place: 1 | 2 | 3;
    is_override: boolean;
    notes: string | null;
    created_at: string;
    updated_at: string;
    teams: {
        id: string;
        name: string;
        slug: string;
        logo_url: string | null;
    };
}

export interface SeasonAwardEntryWithPlayer {
    id: string;
    season_id: string;
    player_id: string;
    award_name: string;
    category: import("./schemas").AwardCategory;
    awarded_at: string;
    created_by: string | null;
    created_at: string;
    full_avatar_url: string | null;
    avatar_bucket_path: string | null;
    players: {
        id: string;
        username: string;
    };
}

export interface ArchiveSeason {
    id: string;
    name: string;
    slug: string;
    region_id: string;
    start_date: string;
    end_date: string | null;
    season_podium: Array<{
        place: number;
        is_override: boolean;
        notes: string | null;
        teams: { id: string; name: string; slug: string; logo_url: string | null };
    }>;
    season_awards: Array<{
        id: string;
        award_name: string;
        category: import("./schemas").AwardCategory;
        awarded_at: string;
        players: { id: string; username: string };
    }>;
}

export interface SeasonDetail {
    id: string;
    name: string;
    slug: string;
    region_id: string;
    start_date: string;
    end_date: string | null;
    season_podium: Array<{
        place: number;
        is_override: boolean;
        notes: string | null;
        teams: { id: string; name: string; slug: string; logo_url: string | null };
    }>;
    season_awards: Array<{
        id: string;
        award_name: string;
        category: import("./schemas").AwardCategory;
        awarded_at: string;
        full_avatar_url: string | null;
        avatar_bucket_path: string | null;
        players: {
            id: string;
            username: string;
            display_name: string | null;
            player_team_seasons: Array<{
                team_id: string;
                season_id: string;
                teams: { id: string; name: string; logo_url: string | null; brick_color: string | null } | null;
            }>;
        };
    }>;
}

export type {
    SeasonIdInput,
    SeasonSlugRegionInput,
    CreateSeasonSchemaInput,
    UpdateSeasonSchemaInput,
    UpsertSeasonPodiumSlotInput,
    DeleteSeasonPodiumSlotInput,
    DeriveSeasonPodiumInput,
    UpsertSeasonAwardInput,
    DeleteSeasonAwardInput,
    AwardCategory,
} from "./schemas";

export {
    SeasonIdSchema,
    SeasonSlugRegionSchema,
    CreateSeasonSchema,
    UpdateSeasonSchema,
    UpsertSeasonPodiumSlotSchema,
    DeleteSeasonPodiumSlotSchema,
    DeriveSeasonPodiumSchema,
    UpsertSeasonAwardSchema,
    DeleteSeasonAwardSchema,
    AwardCategoryEnum,
} from "./schemas";
