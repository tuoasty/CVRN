export interface CreateSeasonInput {
    name: string;
    regionId: string;
    startDate: string;
    endDate?: string | null;
    slug: string;
    theme?: string | null;
}

export interface UpdateSeasonInput {
    seasonId: string;
    name?: string;
    startDate?: string;
    endDate?: string;
    isActive?: boolean;
    slug?: string;
    theme?: string | null;
}

export interface SeasonIdInput {
    seasonId: string;
}

export interface InsertSeasonDto {
    id?: string;
    name: string;
    regionId: string;
    startDate: string;
    slug: string;
    theme?: string | null;
    endDate?: string | null;
    isActive: boolean;
}