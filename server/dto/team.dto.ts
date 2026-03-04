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
    players: Player[];
}

export interface InsertTeamDto {
    id?: string;
    name: string;
    slug: string;
    logoUrl: string;
    seasonId: string;
    brickNumber: number;
    brickColor: string;
}

export interface CreateTeamInput {
    name: string;
    logoFile: File;
    seasonId: string;
    userId: string;
    brickNumber: number;
    brickColor: string;
}