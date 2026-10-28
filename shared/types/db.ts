import {Database} from "@/shared/types/db.override";
import {SupabaseClient} from "@supabase/supabase-js";

export type Match =
    Database["public"]["Tables"]["matches"]["Row"];

export type Team =
    Database["public"]["Tables"]["teams"]["Row"];

export type Player =
    Database["public"]["Tables"]["players"]["Row"];

export type Article =
    Database["public"]["Tables"]["articles"]["Row"];

export type ArticleMedia =
    Database["public"]["Tables"]["article_media"]["Row"];

export type UpdateLog =
    Database["public"]["Tables"]["update_logs"]["Row"];

export type UpdateLogImage =
    Database["public"]["Tables"]["update_log_images"]["Row"];

export type GameDatasetRow =
    Database["public"]["Tables"]["game_datasets"]["Row"];

export type GameTermRow =
    Database["public"]["Tables"]["game_terms"]["Row"];

export type Region =
    Database["public"]["Tables"]["regions"]["Row"];

export type MatchOfficial =
    Database["public"]["Tables"]["match_officials"]["Row"];

export type Season =
    Database["public"]["Tables"]["seasons"]["Row"];

export type PlayerTeamSeason =
    Database["public"]["Tables"]["player_team_seasons"]["Row"];

export type MatchSet =
    Database["public"]["Tables"]["match_sets"]["Row"];

export type Standing =
    Database["public"]["Views"]["standings"]["Row"];

export type PlayoffConfig =
    Database["public"]["Tables"]["playoff_configs"]["Row"];

export type PlayoffBracket =
    Database["public"]["Tables"]["playoff_brackets"]["Row"];

export type SheetConfig =
    Database["public"]["Tables"]["sheet_configs"]["Row"];

export type SheetSyncLog =
    Database["public"]["Tables"]["sheet_sync_logs"]["Row"];

export type SeasonPodium =
    Database["public"]["Tables"]["season_podium"]["Row"];

export type SeasonAward =
    Database["public"]["Tables"]["season_awards"]["Row"];

export type PlayerMatchStats =
    Database["public"]["Tables"]["player_match_stats"]["Row"];

export type MatchSheetConfig =
    Database["public"]["Tables"]["match_sheet_config"]["Row"];

export type PlayerMatchStatSet =
    Database["public"]["Views"]["v_player_match_stat_sets"]["Row"];

export type PlayerMatchStatTotal =
    Database["public"]["Views"]["v_player_match_stat_totals"]["Row"];

export type DBClient = SupabaseClient<Database>;

export type PlayerSeasonStatRow =
    Database["public"]["Views"]["v_player_season_stats"]["Row"];

export type RangedSeasonStatRow =
    Database["public"]["Functions"]["get_player_season_stats_ranged"]["Returns"][number];

export type PlayerLeaderboardViewRow =
    Database["public"]["Views"]["v_player_leaderboard"]["Row"];

export type RecordViewRow =
    Database["public"]["Views"]["v_records"]["Row"];

export type Spec =
    Database["public"]["Tables"]["specs"]["Row"];

export type SpecRequirement =
    Database["public"]["Tables"]["spec_requirements"]["Row"];

export type SpecRegionRule =
    Database["public"]["Tables"]["spec_region_rules"]["Row"];

export type PublicSpecSnapshotRow =
    Database["public"]["Tables"]["public_spec_snapshot"]["Row"];

export type SpecWinner =
    Database["public"]["Tables"]["spec_winners"]["Row"];

export type OverallScalingRow =
    Database["public"]["Tables"]["overall_scalings"]["Row"];

export type OverallScalingInsert =
    Database["public"]["Tables"]["overall_scalings"]["Insert"];

export type PlayerOverallRow =
    Database["public"]["Tables"]["player_overalls"]["Row"];

export type SeasonOverallInputRow =
    Database["public"]["Functions"]["get_overall_inputs"]["Returns"][number];

export type CardGroupRow =
    Database["public"]["Tables"]["card_groups"]["Row"];

export type CardTemplateRow =
    Database["public"]["Tables"]["card_templates"]["Row"];

export type PlayerCardRow =
    Database["public"]["Tables"]["player_cards"]["Row"];

export type PlayerCardInsert =
    Database["public"]["Tables"]["player_cards"]["Insert"];

export type GameAbilitySettingRow =
    Database["public"]["Tables"]["game_ability_settings"]["Row"];
