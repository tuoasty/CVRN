import type {MediaPost} from "@/server/domains/media/types";

export type DashboardMatchType = "season" | "playoffs";

export interface DashboardMatchRow {
    id: string;
    season_id: string;
    match_type: DashboardMatchType;
    status: string;
    week: number | null;
    match_code: string | null;
    scheduled_at: string | null;
    home_team_id: string | null;
    away_team_id: string | null;
    playoff_round: string | null;
}

export interface DashboardTeam {
    id: string;
    name: string;
    logoUrl: string | null;
}

export interface DashboardMatch {
    id: string;
    matchCode: string | null;
    matchType: DashboardMatchType;
    week: number | null;
    playoffRound: string | null;
    home: DashboardTeam;
    away: DashboardTeam;
    gfx: MediaPost | null;
    vod: MediaPost | null;
}

export interface DashboardRound {
    key: string;
    matchType: DashboardMatchType;
    week: number | null;
    playoffRound: string | null;
    matches: DashboardMatch[];
    potw: MediaPost | null;
    totw: MediaPost | null;
}

export interface DashboardColumn {
    regionCode: string;
    seasonId: string;
    seasonName: string;
    teamCount: number;
    rounds: DashboardRound[];
}
