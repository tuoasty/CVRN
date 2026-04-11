export type {
    CreateMatchInput,
    CreateMatchesInput,
    UpdateMatchScheduleInput,
    MatchIdInput,
    InsertMatchDto,
    CompleteMatchInput,
    VoidMatchInput,
    MatchSetsInput,
    MatchOfficialEntry,
    MatchWithDetails,
} from "@/server/dto/match.dto";

export type MatchResultInput = {
    sets: Array<{ setNumber: number; homeScore: number; awayScore: number }>;
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
    setsToInsert: Array<{ setNumber: number; homeScore: number; awayScore: number }>;
    matchMvpPlayerId: string | null;
    loserMvpPlayerId: string | null;
};
