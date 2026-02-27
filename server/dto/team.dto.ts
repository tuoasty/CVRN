import {Player} from "@/shared/types/db";

export interface GetTeamByNameRegion {
    name: string;
    regionId: string;
}

export interface TeamIdInput {
    teamId: string
}

export interface TeamWithRegion {
    id: string;
    name: string;
    slug: string;
    logo_url: string | null;
    region_id: string | null;
    created_at: string;
    regions: {
        code: string;
        name: string;
    } | null;
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
    regionId: string;
    brickNumber: string;
    brickColor: string;
}

export interface CreateTeamInput {
    name: string;
    logoFile: File;
    regionId: string;
    userId: string;
    brickNumber: string;
    brickColor: string;
}