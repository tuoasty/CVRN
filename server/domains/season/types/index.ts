import {PlayoffConfig, Season} from "@/shared/types/db";

export interface CreateSeasonInput {
    name: string;
    regionId: string;
    startDate: string;
    endDate?: string | null;
    maxPlayers: number;
    slug: string;
    seasonNumber: number;
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
    seasonNumber?: number;
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
    seasonNumber: number;
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
    place: number;
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
    sort_order: number;
    full_avatar_url: string | null;
    avatar_bucket_path: string | null;
    all_star_team: import("./schemas").AllStarTeamCode | null;
    all_star_slot: import("./schemas").AllStarSlot | null;
    players: {
        id: string;
        username: string;
    };
}

export interface SeasonAllStarTeam {
    season_id: string;
    code: import("./schemas").AllStarTeamCode;
    name: string;
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
    champion_gfx: Array<{ id: string; image_url: string | null; title: string }>;
}

export interface ChampionArchiveEntry {
    captain: string | null;
    vice_capt: string | null;
    court_cap: string | null;
    members: string[];
}

export type ChampionArchiveResponse = Record<string, ChampionArchiveEntry>;

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
    spec_winners: Array<{
        id: string;
        stars_awarded: number;
        specs: { id: string; name: string; position: string; stars: number } | null;
        players: { id: string; username: string; display_name: string | null; avatar_url: string | null } | null;
    }>;
    champion_gfx: Array<{ id: string; image_url: string | null; title: string }>;
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
    BatchUpsertSeasonAwardsInput,
    UpdateSeasonAwardInput,
    ReorderSeasonAwardsInput,
    AwardCategory,
    AllStarTeamCode,
    AllStarSlot,
    UpsertSeasonAllStarTeamNameInput,
    SeasonNumberQueryInput,
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
    BatchUpsertSeasonAwardsSchema,
    UpdateSeasonAwardSchema,
    ReorderSeasonAwardsSchema,
    AwardCategoryEnum,
    AllStarTeamCodeEnum,
    AllStarSlotEnum,
    UpsertSeasonAllStarTeamNameSchema,
    SeasonNumberQuerySchema,
} from "./schemas";
