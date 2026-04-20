import {MatchOfficial, Official} from "@/shared/types/db";

export interface MatchOfficialWithDetails extends MatchOfficial {
    official: Official;
}

export interface MatchIdInput {
    matchId: string;
}

export type {
    OfficialType,
    AssignOfficialInput,
    AssignMultipleOfficialsInput,
} from "./schemas";

export {
    OfficialTypeSchema,
    AssignOfficialSchema,
    AssignMultipleOfficialsSchema,
} from "./schemas";
