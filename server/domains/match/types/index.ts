import {Match, MatchSet} from "@/shared/types/db";

export interface InsertMatchDto {
    id?: string;
    seasonId: string;
    homeTeamId: string | null;
    awayTeamId: string | null;
    week: number;
    scheduledAt: string | null;
    status: "pending" | "scheduled" | "completed";
    matchType: "season" | "playoffs";
}

export type MatchOfficialEntry = {
    id: string;
    username: string | null;
    display_name: string | null;
    avatar_url: string | null;
    official_type: "referee" | "media";
};

export type MatchWithDetails = {
    match: Match;
    sets: MatchSet[];
    officials: MatchOfficialEntry[];
};

export type {
    CreateMatchInput,
    CreateMatchesInput,
    UpdateMatchScheduleInput,
    MatchIdInput,
    CompleteMatchInput,
    VoidMatchInput,
    MatchSetsInput,
    SeasonWeekInput,
} from "./schemas";

export {
    CreateMatchSchema,
    CreateMatchesSchema,
    CompleteMatchSchema,
    VoidMatchSchema,
    UpdateMatchScheduleSchema,
    MatchIdSchema,
    MatchSetsSchema,
    SeasonWeekSchema,
} from "./schemas";

export type MatchResultInput = {
    sets: Array<{setNumber: number; homeScore: number; awayScore: number}>;
    matchMvpPlayerId?: string | null;
    loserMvpPlayerId?: string | null;
    isForfeit?: boolean;
    forfeitingTeam?: "home" | "away";
};

export type MatchContext = {
    best_of: number;
    match_type: string;
    home_team_id: string | null;
    away_team_id: string | null;
};

export type MatchResultOutput = {
    homeSetsWon: number;
    awaySetsWon: number;
    homeTeamLvr: number | null;
    awayTeamLvr: number | null;
    setsToInsert: Array<{setNumber: number; homeScore: number; awayScore: number}>;
    matchMvpPlayerId: string | null;
    loserMvpPlayerId: string | null;
};

export type RawMatchOfficial = {
    official_type: string;
    officials: {
        id: string;
        username: string | null;
        display_name: string | null;
        avatar_url: string | null;
    };
};

export type MatchWithDetailsRow = {
    match_sets: Array<{
        set_number: number;
        home_score: number;
        away_score: number;
    }>;
    match_officials: RawMatchOfficial[];
    [key: string]: unknown;
};
