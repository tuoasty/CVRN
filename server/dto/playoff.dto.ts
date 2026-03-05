export interface GeneratePlayoffBracketInput {
    seasonId: string;
}

export interface InsertPlayoffBracketDto {
    id?: string;
    seasonId: string;
    round: "play_in" | "round_of_16" | "quarterfinal" | "semifinal" | "final" | "third_place";
    matchId: string;
    seedHome: number | null;
    seedAway: number | null;
    nextBracketId: string | null;
    winnerPosition: "home" | "away" | null;
}

export interface InsertPlayoffMatchDto {
    seasonId: string;
    week: number;
    matchType: "playoffs";
    status: "pending";
    bestOf: 3 | 5;
    homeTeamId?: string | null;
    awayTeamId?: string | null;
}