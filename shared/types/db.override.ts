import type {Database as GeneratedDB, Json} from "@/database.types";

type FixBigInt<T> = {
    [K in keyof T]: K extends 'roblox_user_id'
        ? T[K] extends number
            ? string
            : T[K]
        : T[K] extends object
            ? FixBigInt<T[K]>
            : T[K];
};

type FixedDB = FixBigInt<GeneratedDB>;
type MatchRow = FixedDB['public']['Tables']['matches']['Row'];

type NewRpcFunctions = {
    complete_match: {
        Args: {
            p_match_id: string;
            p_sets: Json;
            p_home_sets_won: number;
            p_away_sets_won: number;
            p_home_lvr: number | null;
            p_away_lvr: number | null;
            p_mvp_player_id: string | null;
            p_loser_mvp_player_id: string | null;
            p_is_forfeit: boolean;
            p_scheduled_at: string | null;
        };
        Returns: MatchRow;
    };
    void_match: {
        Args: { p_match_id: string };
        Returns: MatchRow;
    };
    reapply_match_result: {
        Args: {
            p_match_id: string;
            p_sets: Json;
            p_home_sets_won: number;
            p_away_sets_won: number;
            p_home_lvr: number | null;
            p_away_lvr: number | null;
            p_mvp_player_id: string | null;
            p_loser_mvp_player_id: string | null;
            p_is_forfeit: boolean;
        };
        Returns: MatchRow;
    };
};

type ExtendedPublic = FixedDB['public'] & {
    Functions: FixedDB['public']['Functions'] & NewRpcFunctions;
};

export type Database = Omit<FixedDB, 'public'> & { public: ExtendedPublic };
