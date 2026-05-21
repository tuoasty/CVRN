import {MatchOfficial, Player} from "@/shared/types/db";

export interface MatchOfficialWithDetails extends MatchOfficial {
    official: Player;
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
