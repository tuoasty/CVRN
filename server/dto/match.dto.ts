export interface CreateMatchInput {
    homeId: string;
    awayId: string;
    scheduledDate?: string; //YYYY-MM-DD
    scheduledTime?: string; //HH:MM
    timezone?: string; //IANA timezone
}

export interface CreateMatchesInput {
    seasonId: string;
    week: number;
    defaultScheduledDate?: string;
    defaultScheduledTime?: string;
    defaultTimezone?: string;
    matches: CreateMatchInput[];
}

export interface UpdateMatchScheduleInput {
    matchId: string;
    scheduledDate?: string | null;
    scheduledTime?: string | null;
    timezone?: string | null;
}

export interface MatchIdInput {
    matchId: string;
}

export interface InsertMatchDto {
    id?: string;
    seasonId: string;
    homeTeamId: string;
    awayTeamId: string;
    week: number;
    scheduledAt: string | null;
    status: "pending" | "scheduled" | "completed";
    matchType: "season" | "playoffs";
}

export interface CompleteMatchInput {
    matchId: string;
    sets: Array<{
        setNumber: number;
        homeScore: number;
        awayScore: number;
    }>;
    matchMvpPlayerId: string;
    loserMvpPlayerId: string;
    scheduledDate?: string | null;
    scheduledTime?: string | null;
    timezone?: string | null;
}