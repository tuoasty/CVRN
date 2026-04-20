export interface StandingWithInfo {
    season_id: string | null;
    region_id: string | null;
    team_id: string | null;
    team_name: string | null;
    team_slug: string | null;
    team_logo_url: string | null;
    starting_lvr: number | null;
    wins: number | null;
    losses: number | null;
    sets_won: number | null;
    sets_lost: number | null;
    total_lvr: number | null;
    rank: number | null;
}

export type {GetStandingsInput} from "./schemas";

export {GetStandingsSchema} from "./schemas";
