export interface InsertPlayoffBracketDto {
    id?: string;
    seasonId: string;
    round: string;
    playoffGroup: string;
    matchId: string;
    seedHome: number | null;
    seedAway: number | null;
    displayOrder: number;
    nextBracketId: string | null;
    winnerPosition: "home" | "away" | null;
    loserNextBracketId: string | null;
    loserPosition: "home" | "away" | null;
}

export interface InsertPlayoffMatchDto {
    id?: string;
    seasonId: string;
    week: number;
    matchType: "playoffs";
    status: "pending";
    bestOf: 3 | 5;
    matchCode: string;
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
    PLAYOFF_ROUNDS,
    PlayoffRoundSchema,
    GeneratePlayoffBracketSchema,
    GetPlayoffScheduleSchema,
} from "./schemas";

export type IncomingSource = {
    type: "Winner" | "Loser";
    source: string;
}

export type Incoming = {
    home?: IncomingSource;
    away?: IncomingSource;
}