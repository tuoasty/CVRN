import type {StandingWithInfo} from "@/server/domains/standing";
import type {MatchWithDetails} from "@/server/domains/match";
import type {StandingMethod} from "@/shared/types/standing";

export type SortColumn = "lvr" | "w" | "pts";

export interface TeamRef {
    id: string;
    name: string;
    slug: string | null;
    logoUrl: string | null;
    logoBgRemoved: boolean;
}

export interface FormEntry {
    matchId: string;
    matchCode: string | null;
    outcome: "W" | "L";
    teamSets: number;
    opponentSets: number;
    opponent: TeamRef | null;
    homeTeamName: string | null;
    awayTeamName: string | null;
}

export interface NextFixture {
    matchId: string;
    matchCode: string | null;
    opponent: TeamRef;
    scheduledAt: string | null;
    week: number | null;
    homeTeamName: string;
    awayTeamName: string;
}

export interface StandingsRow {
    rank: number | null;
    team: TeamRef;
    played: number;
    wins: number;
    losses: number;
    setsWon: number;
    setsLost: number;
    setDiff: number;
    metric: number;
    form: FormEntry[];
    next: NextFixture | null;
}

export interface ZoneRule {
    afterRank: number;
    label: "Play-in" | "Out";
    variant: "solid" | "dashed";
}

export interface StandingsTableModel {
    method: StandingMethod;
    sortColumn: SortColumn;
    rows: StandingsRow[];
    zones: ZoneRule[];
    showNext: boolean;
    qualifiedTeams: number | null;
    playinTeams: number;
    hasCarryInPoints: boolean;
}

export interface BuildStandingsTableInput {
    standings: StandingWithInfo[];
    completed: MatchWithDetails[];
    upcoming: MatchWithDetails[];
    method: StandingMethod;
    qualifiedTeams: number | null | undefined;
    playinTeams: number | null | undefined;
}
