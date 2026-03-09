import {Player} from "@/shared/types/db";

export interface GetTeamByNameSeason {
    name: string;
    seasonId: string;
}

export interface TeamIdInput {
    teamId: string
}

export interface TeamWithRegion {
    id: string;
    name: string;
    slug: string;
    logo_url: string | null;
    season_id: string;
    deleted_at: string | null;
    created_at: string;
    brick_number: number;
    brick_color: string;
    starting_lvr: number;
    is_bye: boolean;
    seasons: {
        id: string;
        name: string;
        slug: string;
        regions: {
            id: string;
            code: string;
            name: string;
        };
    };
}

export interface TeamWithRegionAndPlayers {
    team: TeamWithRegion;
    players: PlayerWithRole[];
}

export interface InsertTeamDto {
    id?: string;
    name: string;
    slug: string;
    logoUrl: string;
    seasonId: string;
    brickNumber: number;
    brickColor: string;
    startingLvr: number;
}

export interface CreateTeamInput {
    name: string;
    logoFile: File;
    seasonId: string;
    userId: string;
    brickNumber: number;
    brickColor: string;
    startingLvr: number;
}

export interface UpdateTeamInput {
    teamId: string;
    name: string;
    logoFile?: File | null;
    brickNumber: number;
    brickColor: string;
    userId: string;
    startingLvr: number;
}