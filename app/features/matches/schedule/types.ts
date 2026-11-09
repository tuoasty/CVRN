import type {Match} from "@/shared/types/db";
import type {MatchWithDetails} from "@/server/domains/match";
import type {TeamWithRegion} from "@/server/domains/team";
import type {StandingMethod} from "@/shared/types/standing";

export type ScheduleKind = "season" | "playoffs";

export interface ScheduleTeam {
    id: string;
    name: string;
    logoUrl: string | null;
    logoBgRemoved: boolean;
    tag: string | null;
    won: boolean;
}

export interface ScheduleRow {
    matchId: string;
    match: Match;
    time: string | null;
    label: string;
    home: ScheduleTeam;
    away: ScheduleTeam;
    isCompleted: boolean;
    homeSets: number | null;
    awaySets: number | null;
    sets: {home: number; away: number}[];
    isForfeit: boolean;
    impact: string | null;
}

export interface ScheduleDay {
    key: string;
    label: string;
    isToday: boolean;
    rows: ScheduleRow[];
}

export interface ScheduleView {
    upcoming: ScheduleDay[];
    results: ScheduleDay[];
}

export interface BuildScheduleInput {
    kind: ScheduleKind;
    matches: MatchWithDetails[];
    teams: Map<string, TeamWithRegion>;
    timeZone: string;
    now: Date;
    standingMethod: StandingMethod;
    seeds: Record<string, number>;
    records: Map<string, {wins: number; losses: number}>;
}
