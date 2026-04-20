import {MatchOfficial, Official} from "@/shared/types/db";

export interface MatchOfficialWithDetails extends MatchOfficial {
    official: Official;
}

export type {MatchIdInput} from "@/server/dto/matchOfficial.dto";

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
