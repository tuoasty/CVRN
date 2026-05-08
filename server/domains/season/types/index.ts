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
    endDate?: string | null;
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
    CreateSeasonSchemaInput,
    UpdateSeasonSchemaInput,
} from "./schemas";

export {
    SeasonIdSchema,
    SeasonSlugRegionSchema,
    CreateSeasonSchema,
    UpdateSeasonSchema,
} from "./schemas";
