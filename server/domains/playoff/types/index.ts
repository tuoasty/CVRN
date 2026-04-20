export interface InsertPlayoffBracketDto {
    id?: string;
    seasonId: string;
    round: "play_in" | "round_of_16" | "quarterfinal" | "semifinal" | "final" | "third_place";
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
    homeTeamId?: string | null;
    awayTeamId?: string | null;
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
