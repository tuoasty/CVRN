export interface CreateMatchInput {
    homeId: string;
    awayId: string;
    proposedScheduledAt?: string | null;
}

export interface CreateMatchesInput {
    seasonId: string;
    regionId: string;
    week: number;
    matches: CreateMatchInput[];
}

export interface MatchIdInput {
    matchId: string;
}

export interface InsertMatchDto {
    id?: string;
    seasonId: string;
    regionId: string;
    homeTeamId: string;
    awayTeamId: string;
    week: number;
    scheduledAt: string | null;
    status: "pending" | "scheduled" | "completed";
    matchType: "season" | "playoffs";
}