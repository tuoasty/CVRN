import {MatchOfficial, Official} from "@/shared/types/db";

export interface MatchOfficialWithDetails extends MatchOfficial {
    official: Official;
}

export type {
    AssignOfficialInput,
    AssignMultipleOfficialsInput,
    MatchIdInput,
    OfficialType
} from "@/server/dto/matchOfficial.dto";
