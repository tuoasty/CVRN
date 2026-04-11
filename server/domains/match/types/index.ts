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

export type RawMatchOfficial = {
    official_type: "referee" | "media";
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
