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