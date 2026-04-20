export type {
    TeamWithRegion,
    TeamWithRegionAndPlayers,
    InsertTeamDto,
    CreateTeamInput,
    UpdateTeamInput,
} from "@/server/dto/team.dto";

export type {
    GetTeamByNameSeason,
    TeamIdInput,
    TeamSlugSeasonInput,
    CreateTeamFormInput,
    UpdateTeamFormInput,
} from "./schemas";

export {
    GetTeamByNameSeasonSchema,
    TeamIdSchema,
    TeamSlugSeasonSchema,
    CreateTeamFormSchema,
    UpdateTeamFormSchema,
} from "./schemas";
