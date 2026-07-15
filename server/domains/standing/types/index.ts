export interface StandingWithInfo {
    season_id: string | null;
    region_id: string | null;
    team_id: string | null;
    team_name: string | null;
    team_slug: string | null;
    team_logo_url: string | null;
    team_logo_bg_removed: boolean | null;
    starting_lvr: number | null;
    starting_points: number | null;
    wins: number | null;
    losses: number | null;
    sets_won: number | null;
    sets_lost: number | null;
    total_lvr: number | null;
    total_points: number | null;
    total_bonus: number | null;
    last_round_point_diff: number | null;
    rank: number | null;
}

export type {GetStandingsInput} from "./schemas";

export {GetStandingsSchema} from "./schemas";
