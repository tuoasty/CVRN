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
    matchCode?: string;
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
    playoff_round?: string | null;
};

export type SeasonPlayoffSchedule = {
    matches: MatchWithDetails[];
    seeds: Record<string, number>;
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
    forfeitingTeam?: "home" | "away" | "both";
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
    homeTeamPoints: number | null;
    awayTeamPoints: number | null;
    homeTeamBonus: number | null;
    awayTeamBonus: number | null;
    pointDiff: number | null;
    setsToInsert: Array<{setNumber: number; homeScore: number; awayScore: number}>;
    matchMvpPlayerId: string | null;
    loserMvpPlayerId: string | null;
};

export type RawMatchOfficial = {
    official_type: string;
    players: {
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

export type MatchSitemapRow = Pick<Match, "match_code" | "season_id" | "home_team_id" | "away_team_id" | "updated_at">;

export interface PlayerMatchSide {
    id: string;
    name: string;
    logoUrl: string | null;
    logoBgRemoved: boolean;
    isBye: boolean;
}

export interface PlayerMatchCandidate {
    id: string;
    seasonId: string;
    seasonNumber: number;
    seasonSlug: string;
    regionCode: string;
    matchCode: string | null;
    matchType: "season" | "playoffs";
    week: number | null;
    scheduledAt: string | null;
    isForfeit: boolean;
    home: PlayerMatchSide | null;
    away: PlayerMatchSide | null;
    homeSetsWon: number | null;
    awaySetsWon: number | null;
    sets: {setNumber: number; homeScore: number; awayScore: number}[];
}

export interface PlayerRosterWindow {
    teamId: string;
    seasonId: string;
    joinedAt: string;
    leftAt: string | null;
}

export interface PlayerRecentMatch {
    id: string;
    href: {matchCode: string | null; homeTeamName: string; awayTeamName: string; regionCode: string; seasonSlug: string};
    roundLabel: string;
    scheduledAt: string | null;
    regionCode: string;
    isForfeit: boolean;
    team: PlayerMatchSide;
    opponent: PlayerMatchSide;
    teamSets: number | null;
    opponentSets: number | null;
    setScores: {team: number; opponent: number}[];
}
