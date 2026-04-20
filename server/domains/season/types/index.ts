import {PlayoffConfig, Season} from "@/shared/types/db";

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

export interface SeasonWithPlayoffConfig extends Season {
    playoff_configs: PlayoffConfig | null;
}

export type {
    SeasonIdInput,
    SeasonSlugRegionInput,
} from "./schemas";

export {
    SeasonIdSchema,
    SeasonSlugRegionSchema,
} from "./schemas";
