export interface InsertPlayoffBracketDto {
    id?: string;
    seasonId: string;
    round: string;
    playoff_group: string;
    matchId: string;
    seedHome: number | null;
    seedAway: number | null;
    nextBracketId: string | null;
    winnerPosition: "home" | "away" | null;
    loserNextBracketId?: string | null;
    loserPosition?: "home" | "away" | null;
}

export interface InsertPlayoffMatchDto {
    id?: string;
    seasonId: string;
    week: number;
    matchType: "playoffs";
    status: "pending";
    bestOf: 3 | 5;
    match_code: string;
    homeTeamId?: string | null;
    awayTeamId?: string | null;
}

export interface SeedSlot {
    type: "seed";
    value: number;
}

export interface MatchSlot {
    type: "match";
    code: string;
    result:"winner"|"loser"
}

export type PlayoffTeamSlot = SeedSlot | MatchSlot;

export interface PlayoffMatchTemplate {
    code: string;
    best_of: 3 | 5;
    home:PlayoffTeamSlot
    away:PlayoffTeamSlot;
}

export interface PlayoffRoundGroup {
    round: string;
    matches: PlayoffMatchTemplate[];
}

export interface PlayoffTemplate {
    teams: number;
    upper: PlayoffRoundGroup[];
    lower: PlayoffRoundGroup[];
}

export type {
    PlayoffRound,
    GeneratePlayoffBracketInput,
    GetPlayoffScheduleInput,
} from "./schemas";

export {
    PlayoffRoundSchema,
    GeneratePlayoffBracketSchema,
    GetPlayoffScheduleSchema,
} from "./schemas";
