export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.5"
  }
  graphql_public: {
    Tables: {
      [_ in never]: never
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      graphql: {
        Args: {
          extensions?: Json
          operationName?: string
          query?: string
          variables?: Json
        }
        Returns: Json
      }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
  public: {
    Tables: {
      article_media: {
        Row: {
          article_id: string
          created_at: string
          handle: string
          id: string
          media_post_id: string
          placement: string
          sort_order: number
        }
        Insert: {
          article_id: string
          created_at?: string
          handle: string
          id?: string
          media_post_id: string
          placement?: string
          sort_order?: number
        }
        Update: {
          article_id?: string
          created_at?: string
          handle?: string
          id?: string
          media_post_id?: string
          placement?: string
          sort_order?: number
        }
        Relationships: [
          {
            foreignKeyName: "article_media_article_id_fkey"
            columns: ["article_id"]
            isOneToOne: false
            referencedRelation: "articles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "article_media_media_post_id_fkey"
            columns: ["media_post_id"]
            isOneToOne: false
            referencedRelation: "media_posts"
            referencedColumns: ["id"]
          },
        ]
      }
      articles: {
        Row: {
          author_id: string | null
          body: string
          created_at: string
          created_by: string
          id: string
          match_id: string | null
          published_at: string | null
          season_id: string | null
          slug: string
          title: string
          updated_at: string
        }
        Insert: {
          author_id?: string | null
          body: string
          created_at?: string
          created_by: string
          id?: string
          match_id?: string | null
          published_at?: string | null
          season_id?: string | null
          slug: string
          title: string
          updated_at?: string
        }
        Update: {
          author_id?: string | null
          body?: string
          created_at?: string
          created_by?: string
          id?: string
          match_id?: string | null
          published_at?: string | null
          season_id?: string | null
          slug?: string
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "articles_author_id_fkey"
            columns: ["author_id"]
            isOneToOne: false
            referencedRelation: "players"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "articles_author_id_fkey"
            columns: ["author_id"]
            isOneToOne: false
            referencedRelation: "v_leaderboard_identity"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "articles_match_id_fkey"
            columns: ["match_id"]
            isOneToOne: false
            referencedRelation: "matches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "articles_season_id_fkey"
            columns: ["season_id"]
            isOneToOne: false
            referencedRelation: "seasons"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "articles_season_id_fkey"
            columns: ["season_id"]
            isOneToOne: false
            referencedRelation: "standings"
            referencedColumns: ["season_id"]
          },
        ]
      }
      cache_versions: {
        Row: {
          tag: string
          updated_at: string
          version: number
        }
        Insert: {
          tag: string
          updated_at?: string
          version?: number
        }
        Update: {
          tag?: string
          updated_at?: string
          version?: number
        }
        Relationships: []
      }
      match_officials: {
        Row: {
          created_at: string
          id: string
          match_id: string
          official_type: string
          player_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          match_id: string
          official_type: string
          player_id: string
        }
        Update: {
          created_at?: string
          id?: string
          match_id?: string
          official_type?: string
          player_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "match_officials_match_id_fkey"
            columns: ["match_id"]
            isOneToOne: false
            referencedRelation: "matches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "match_officials_player_id_fkey"
            columns: ["player_id"]
            isOneToOne: false
            referencedRelation: "players"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "match_officials_player_id_fkey"
            columns: ["player_id"]
            isOneToOne: false
            referencedRelation: "v_leaderboard_identity"
            referencedColumns: ["id"]
          },
        ]
      }
      match_sets: {
        Row: {
          away_score: number
          created_at: string
          home_score: number
          id: string
          match_id: string
          set_number: number
          updated_at: string
        }
        Insert: {
          away_score?: number
          created_at?: string
          home_score?: number
          id?: string
          match_id: string
          set_number: number
          updated_at?: string
        }
        Update: {
          away_score?: number
          created_at?: string
          home_score?: number
          id?: string
          match_id?: string
          set_number?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "match_sets_match_id_fkey"
            columns: ["match_id"]
            isOneToOne: false
            referencedRelation: "matches"
            referencedColumns: ["id"]
          },
        ]
      }
      match_sheet_config: {
        Row: {
          created_at: string
          id: string
          match_id: string
          sheet_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          match_id: string
          sheet_id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          match_id?: string
          sheet_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "match_sheet_config_match_id_fkey"
            columns: ["match_id"]
            isOneToOne: true
            referencedRelation: "matches"
            referencedColumns: ["id"]
          },
        ]
      }
      matches: {
        Row: {
          away_sets_won: number | null
          away_team_bonus: number | null
          away_team_id: string | null
          away_team_lvr: number | null
          away_team_points: number | null
          best_of: number
          created_at: string
          home_sets_won: number | null
          home_team_bonus: number | null
          home_team_id: string | null
          home_team_lvr: number | null
          home_team_points: number | null
          id: string
          is_forfeit: boolean | null
          loser_mvp_player_id: string | null
          match_code: string | null
          match_mvp_player_id: string | null
          match_type: Database["public"]["Enums"]["match_type"]
          point_diff: number | null
          scheduled_at: string | null
          season_id: string
          status: Database["public"]["Enums"]["match_status"]
          updated_at: string
          week: number | null
        }
        Insert: {
          away_sets_won?: number | null
          away_team_bonus?: number | null
          away_team_id?: string | null
          away_team_lvr?: number | null
          away_team_points?: number | null
          best_of?: number
          created_at?: string
          home_sets_won?: number | null
          home_team_bonus?: number | null
          home_team_id?: string | null
          home_team_lvr?: number | null
          home_team_points?: number | null
          id?: string
          is_forfeit?: boolean | null
          loser_mvp_player_id?: string | null
          match_code?: string | null
          match_mvp_player_id?: string | null
          match_type?: Database["public"]["Enums"]["match_type"]
          point_diff?: number | null
          scheduled_at?: string | null
          season_id: string
          status?: Database["public"]["Enums"]["match_status"]
          updated_at?: string
          week?: number | null
        }
        Update: {
          away_sets_won?: number | null
          away_team_bonus?: number | null
          away_team_id?: string | null
          away_team_lvr?: number | null
          away_team_points?: number | null
          best_of?: number
          created_at?: string
          home_sets_won?: number | null
          home_team_bonus?: number | null
          home_team_id?: string | null
          home_team_lvr?: number | null
          home_team_points?: number | null
          id?: string
          is_forfeit?: boolean | null
          loser_mvp_player_id?: string | null
          match_code?: string | null
          match_mvp_player_id?: string | null
          match_type?: Database["public"]["Enums"]["match_type"]
          point_diff?: number | null
          scheduled_at?: string | null
          season_id?: string
          status?: Database["public"]["Enums"]["match_status"]
          updated_at?: string
          week?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "matches_away_team_id_fkey"
            columns: ["away_team_id"]
            isOneToOne: false
            referencedRelation: "standings"
            referencedColumns: ["team_id"]
          },
          {
            foreignKeyName: "matches_away_team_id_fkey"
            columns: ["away_team_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "matches_away_team_id_fkey"
            columns: ["away_team_id"]
            isOneToOne: false
            referencedRelation: "v_player_leaderboard"
            referencedColumns: ["team_id"]
          },
          {
            foreignKeyName: "matches_home_team_id_fkey"
            columns: ["home_team_id"]
            isOneToOne: false
            referencedRelation: "standings"
            referencedColumns: ["team_id"]
          },
          {
            foreignKeyName: "matches_home_team_id_fkey"
            columns: ["home_team_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "matches_home_team_id_fkey"
            columns: ["home_team_id"]
            isOneToOne: false
            referencedRelation: "v_player_leaderboard"
            referencedColumns: ["team_id"]
          },
          {
            foreignKeyName: "matches_loser_mvp_player_id_fkey"
            columns: ["loser_mvp_player_id"]
            isOneToOne: false
            referencedRelation: "players"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "matches_loser_mvp_player_id_fkey"
            columns: ["loser_mvp_player_id"]
            isOneToOne: false
            referencedRelation: "v_leaderboard_identity"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "matches_match_mvp_player_id_fkey"
            columns: ["match_mvp_player_id"]
            isOneToOne: false
            referencedRelation: "players"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "matches_match_mvp_player_id_fkey"
            columns: ["match_mvp_player_id"]
            isOneToOne: false
            referencedRelation: "v_leaderboard_identity"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "matches_season_id_fkey"
            columns: ["season_id"]
            isOneToOne: false
            referencedRelation: "seasons"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "matches_season_id_fkey"
            columns: ["season_id"]
            isOneToOne: false
            referencedRelation: "standings"
            referencedColumns: ["season_id"]
          },
        ]
      }
      media_posts: {
        Row: {
          article_id: string | null
          author_id: string | null
          created_at: string
          created_by: string
          description: string | null
          id: string
          image_url: string | null
          is_pinned: boolean
          match_id: string | null
          pinned_at: string | null
          player_id: string | null
          published_at: string
          season_id: string | null
          team_id: string | null
          title: string
          type: string
          updated_at: string | null
          video_url: string | null
        }
        Insert: {
          article_id?: string | null
          author_id?: string | null
          created_at?: string
          created_by: string
          description?: string | null
          id?: string
          image_url?: string | null
          is_pinned?: boolean
          match_id?: string | null
          pinned_at?: string | null
          player_id?: string | null
          published_at?: string
          season_id?: string | null
          team_id?: string | null
          title: string
          type: string
          updated_at?: string | null
          video_url?: string | null
        }
        Update: {
          article_id?: string | null
          author_id?: string | null
          created_at?: string
          created_by?: string
          description?: string | null
          id?: string
          image_url?: string | null
          is_pinned?: boolean
          match_id?: string | null
          pinned_at?: string | null
          player_id?: string | null
          published_at?: string
          season_id?: string | null
          team_id?: string | null
          title?: string
          type?: string
          updated_at?: string | null
          video_url?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "media_posts_article_id_fkey"
            columns: ["article_id"]
            isOneToOne: false
            referencedRelation: "articles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "media_posts_author_id_fkey"
            columns: ["author_id"]
            isOneToOne: false
            referencedRelation: "players"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "media_posts_author_id_fkey"
            columns: ["author_id"]
            isOneToOne: false
            referencedRelation: "v_leaderboard_identity"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "media_posts_match_id_fkey"
            columns: ["match_id"]
            isOneToOne: false
            referencedRelation: "matches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "media_posts_player_id_fkey"
            columns: ["player_id"]
            isOneToOne: false
            referencedRelation: "players"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "media_posts_player_id_fkey"
            columns: ["player_id"]
            isOneToOne: false
            referencedRelation: "v_leaderboard_identity"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "media_posts_season_id_fkey"
            columns: ["season_id"]
            isOneToOne: false
            referencedRelation: "seasons"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "media_posts_season_id_fkey"
            columns: ["season_id"]
            isOneToOne: false
            referencedRelation: "standings"
            referencedColumns: ["season_id"]
          },
          {
            foreignKeyName: "media_posts_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "standings"
            referencedColumns: ["team_id"]
          },
          {
            foreignKeyName: "media_posts_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "media_posts_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "v_player_leaderboard"
            referencedColumns: ["team_id"]
          },
        ]
      }
      pending_users: {
        Row: {
          accepted: boolean | null
          email: string
          expires_at: string | null
          id: string
          invited_by: string | null
          notes: string | null
          requested_at: string | null
          role: string
        }
        Insert: {
          accepted?: boolean | null
          email: string
          expires_at?: string | null
          id?: string
          invited_by?: string | null
          notes?: string | null
          requested_at?: string | null
          role: string
        }
        Update: {
          accepted?: boolean | null
          email?: string
          expires_at?: string | null
          id?: string
          invited_by?: string | null
          notes?: string | null
          requested_at?: string | null
          role?: string
        }
        Relationships: []
      }
      player_match_stats: {
        Row: {
          aces: number
          ape_attempts: number
          ape_kills: number
          assists: number
          block_follows: number
          block_touches: number
          created_at: string
          delay_kills: number
          digs: number
          dives: number
          float_aces: number
          id: string
          jump_serve_aces: number
          kill_attempts: number
          kill_blocks: number
          match_id: string
          misc_errors: number
          player_id: string
          position: string | null
          quick_kills: number
          receive_errors: number
          serve_receives: number
          service_errors: number
          set_number: number
          setting_errors: number
          spiking_errors: number
          team_id: string
          wipes_tools: number
        }
        Insert: {
          aces: number
          ape_attempts: number
          ape_kills: number
          assists: number
          block_follows: number
          block_touches: number
          created_at?: string
          delay_kills: number
          digs: number
          dives: number
          float_aces?: number
          id?: string
          jump_serve_aces?: number
          kill_attempts: number
          kill_blocks: number
          match_id: string
          misc_errors: number
          player_id: string
          position?: string | null
          quick_kills: number
          receive_errors?: number
          serve_receives?: number
          service_errors: number
          set_number: number
          setting_errors: number
          spiking_errors: number
          team_id: string
          wipes_tools: number
        }
        Update: {
          aces?: number
          ape_attempts?: number
          ape_kills?: number
          assists?: number
          block_follows?: number
          block_touches?: number
          created_at?: string
          delay_kills?: number
          digs?: number
          dives?: number
          float_aces?: number
          id?: string
          jump_serve_aces?: number
          kill_attempts?: number
          kill_blocks?: number
          match_id?: string
          misc_errors?: number
          player_id?: string
          position?: string | null
          quick_kills?: number
          receive_errors?: number
          serve_receives?: number
          service_errors?: number
          set_number?: number
          setting_errors?: number
          spiking_errors?: number
          team_id?: string
          wipes_tools?: number
        }
        Relationships: [
          {
            foreignKeyName: "player_stats_match_id_fkey"
            columns: ["match_id"]
            isOneToOne: false
            referencedRelation: "matches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "player_stats_player_id_fkey"
            columns: ["player_id"]
            isOneToOne: false
            referencedRelation: "players"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "player_stats_player_id_fkey"
            columns: ["player_id"]
            isOneToOne: false
            referencedRelation: "v_leaderboard_identity"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "player_stats_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "standings"
            referencedColumns: ["team_id"]
          },
          {
            foreignKeyName: "player_stats_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "player_stats_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "v_player_leaderboard"
            referencedColumns: ["team_id"]
          },
        ]
      }
      player_team_seasons: {
        Row: {
          created_at: string
          height: string | null
          id: string
          joined_at: string
          left_at: string | null
          player_id: string
          position: string | null
          role: string | null
          season_id: string
          team_id: string
        }
        Insert: {
          created_at?: string
          height?: string | null
          id?: string
          joined_at?: string
          left_at?: string | null
          player_id: string
          position?: string | null
          role?: string | null
          season_id: string
          team_id: string
        }
        Update: {
          created_at?: string
          height?: string | null
          id?: string
          joined_at?: string
          left_at?: string | null
          player_id?: string
          position?: string | null
          role?: string | null
          season_id?: string
          team_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "player_team_seasons_player_id_fkey"
            columns: ["player_id"]
            isOneToOne: false
            referencedRelation: "players"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "player_team_seasons_player_id_fkey"
            columns: ["player_id"]
            isOneToOne: false
            referencedRelation: "v_leaderboard_identity"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "player_team_seasons_season_id_fkey"
            columns: ["season_id"]
            isOneToOne: false
            referencedRelation: "seasons"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "player_team_seasons_season_id_fkey"
            columns: ["season_id"]
            isOneToOne: false
            referencedRelation: "standings"
            referencedColumns: ["season_id"]
          },
          {
            foreignKeyName: "player_team_seasons_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "standings"
            referencedColumns: ["team_id"]
          },
          {
            foreignKeyName: "player_team_seasons_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "player_team_seasons_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "v_player_leaderboard"
            referencedColumns: ["team_id"]
          },
        ]
      }
      players: {
        Row: {
          avatar_url: string | null
          created_at: string
          display_name: string | null
          id: string
          jersey_number: number | null
          last_synced_at: string
          roblox_user_id: number
          updated_at: string
          username: string
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          display_name?: string | null
          id?: string
          jersey_number?: number | null
          last_synced_at?: string
          roblox_user_id: number
          updated_at?: string
          username: string
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          display_name?: string | null
          id?: string
          jersey_number?: number | null
          last_synced_at?: string
          roblox_user_id?: number
          updated_at?: string
          username?: string
        }
        Relationships: []
      }
      playoff_brackets: {
        Row: {
          created_at: string
          display_order: number | null
          id: string
          loser_next_bracket_id: string | null
          loser_position: string | null
          match_id: string
          next_bracket_id: string | null
          playoff_group: string
          round: string
          season_id: string
          seed_away: number | null
          seed_home: number | null
          winner_position: string | null
        }
        Insert: {
          created_at?: string
          display_order?: number | null
          id?: string
          loser_next_bracket_id?: string | null
          loser_position?: string | null
          match_id: string
          next_bracket_id?: string | null
          playoff_group?: string
          round: string
          season_id: string
          seed_away?: number | null
          seed_home?: number | null
          winner_position?: string | null
        }
        Update: {
          created_at?: string
          display_order?: number | null
          id?: string
          loser_next_bracket_id?: string | null
          loser_position?: string | null
          match_id?: string
          next_bracket_id?: string | null
          playoff_group?: string
          round?: string
          season_id?: string
          seed_away?: number | null
          seed_home?: number | null
          winner_position?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "playoff_brackets_loser_next_bracket_id_fkey"
            columns: ["loser_next_bracket_id"]
            isOneToOne: false
            referencedRelation: "playoff_brackets"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "playoff_brackets_match_id_fkey"
            columns: ["match_id"]
            isOneToOne: true
            referencedRelation: "matches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "playoff_brackets_next_bracket_id_fkey"
            columns: ["next_bracket_id"]
            isOneToOne: false
            referencedRelation: "playoff_brackets"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "playoff_brackets_season_id_fkey"
            columns: ["season_id"]
            isOneToOne: false
            referencedRelation: "seasons"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "playoff_brackets_season_id_fkey"
            columns: ["season_id"]
            isOneToOne: false
            referencedRelation: "standings"
            referencedColumns: ["season_id"]
          },
        ]
      }
      playoff_configs: {
        Row: {
          created_at: string
          elimination_type: string
          id: string
          name: string
          playin_teams: number
          qualified_teams: number
          template: string | null
        }
        Insert: {
          created_at?: string
          elimination_type: string
          id?: string
          name: string
          playin_teams: number
          qualified_teams: number
          template?: string | null
        }
        Update: {
          created_at?: string
          elimination_type?: string
          id?: string
          name?: string
          playin_teams?: number
          qualified_teams?: number
          template?: string | null
        }
        Relationships: []
      }
      public_spec_snapshot: {
        Row: {
          generated_at: string
          id: number
          payload: Json
          pool_size: number
        }
        Insert: {
          generated_at?: string
          id?: number
          payload: Json
          pool_size?: number
        }
        Update: {
          generated_at?: string
          id?: number
          payload?: Json
          pool_size?: number
        }
        Relationships: []
      }
      regions: {
        Row: {
          code: string
          id: string
          name: string
          standing_method: string
        }
        Insert: {
          code: string
          id?: string
          name: string
          standing_method?: string
        }
        Update: {
          code?: string
          id?: string
          name?: string
          standing_method?: string
        }
        Relationships: []
      }
      season_awards: {
        Row: {
          avatar_bucket_path: string | null
          award_name: string
          awarded_at: string
          category: Database["public"]["Enums"]["award_category"]
          created_at: string
          created_by: string | null
          full_avatar_url: string | null
          id: string
          player_id: string
          season_id: string
          sort_order: number
        }
        Insert: {
          avatar_bucket_path?: string | null
          award_name: string
          awarded_at?: string
          category?: Database["public"]["Enums"]["award_category"]
          created_at?: string
          created_by?: string | null
          full_avatar_url?: string | null
          id?: string
          player_id: string
          season_id: string
          sort_order?: number
        }
        Update: {
          avatar_bucket_path?: string | null
          award_name?: string
          awarded_at?: string
          category?: Database["public"]["Enums"]["award_category"]
          created_at?: string
          created_by?: string | null
          full_avatar_url?: string | null
          id?: string
          player_id?: string
          season_id?: string
          sort_order?: number
        }
        Relationships: [
          {
            foreignKeyName: "season_awards_player_id_fkey"
            columns: ["player_id"]
            isOneToOne: false
            referencedRelation: "players"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "season_awards_player_id_fkey"
            columns: ["player_id"]
            isOneToOne: false
            referencedRelation: "v_leaderboard_identity"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "season_awards_season_id_fkey"
            columns: ["season_id"]
            isOneToOne: false
            referencedRelation: "seasons"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "season_awards_season_id_fkey"
            columns: ["season_id"]
            isOneToOne: false
            referencedRelation: "standings"
            referencedColumns: ["season_id"]
          },
        ]
      }
      season_podium: {
        Row: {
          created_at: string
          id: string
          is_override: boolean
          notes: string | null
          place: number
          season_id: string
          team_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_override?: boolean
          notes?: string | null
          place: number
          season_id: string
          team_id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          is_override?: boolean
          notes?: string | null
          place?: number
          season_id?: string
          team_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "season_podium_season_id_fkey"
            columns: ["season_id"]
            isOneToOne: false
            referencedRelation: "seasons"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "season_podium_season_id_fkey"
            columns: ["season_id"]
            isOneToOne: false
            referencedRelation: "standings"
            referencedColumns: ["season_id"]
          },
          {
            foreignKeyName: "season_podium_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "standings"
            referencedColumns: ["team_id"]
          },
          {
            foreignKeyName: "season_podium_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "season_podium_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "v_player_leaderboard"
            referencedColumns: ["team_id"]
          },
        ]
      }
      seasons: {
        Row: {
          created_at: string
          end_date: string | null
          id: string
          league_type: string
          max_players: number
          name: string
          playoff_completed: boolean
          playoff_config_id: string | null
          playoff_started: boolean
          region_id: string
          season_number: number
          slug: string
          start_date: string
          theme: string | null
          updated_at: string
          weeks: number | null
        }
        Insert: {
          created_at?: string
          end_date?: string | null
          id?: string
          league_type?: string
          max_players?: number
          name: string
          playoff_completed?: boolean
          playoff_config_id?: string | null
          playoff_started?: boolean
          region_id: string
          season_number: number
          slug: string
          start_date: string
          theme?: string | null
          updated_at?: string
          weeks?: number | null
        }
        Update: {
          created_at?: string
          end_date?: string | null
          id?: string
          league_type?: string
          max_players?: number
          name?: string
          playoff_completed?: boolean
          playoff_config_id?: string | null
          playoff_started?: boolean
          region_id?: string
          season_number?: number
          slug?: string
          start_date?: string
          theme?: string | null
          updated_at?: string
          weeks?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "seasons_playoff_config_id_fkey"
            columns: ["playoff_config_id"]
            isOneToOne: false
            referencedRelation: "playoff_configs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "seasons_region_id_fkey"
            columns: ["region_id"]
            isOneToOne: false
            referencedRelation: "regions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "seasons_region_id_fkey"
            columns: ["region_id"]
            isOneToOne: false
            referencedRelation: "v_player_leaderboard"
            referencedColumns: ["region_id"]
          },
        ]
      }
      sheet_configs: {
        Row: {
          block_height: number
          block_stride: number
          created_at: string | null
          cron_enabled: boolean
          header_row: number
          id: string
          is_active: boolean
          season_id: string
          sheet_id: string
          sheet_type: string
          tab_name: string
          updated_at: string | null
        }
        Insert: {
          block_height?: number
          block_stride?: number
          created_at?: string | null
          cron_enabled?: boolean
          header_row?: number
          id?: string
          is_active?: boolean
          season_id: string
          sheet_id: string
          sheet_type: string
          tab_name: string
          updated_at?: string | null
        }
        Update: {
          block_height?: number
          block_stride?: number
          created_at?: string | null
          cron_enabled?: boolean
          header_row?: number
          id?: string
          is_active?: boolean
          season_id?: string
          sheet_id?: string
          sheet_type?: string
          tab_name?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "sheet_configs_season_id_fkey"
            columns: ["season_id"]
            isOneToOne: false
            referencedRelation: "seasons"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sheet_configs_season_id_fkey"
            columns: ["season_id"]
            isOneToOne: false
            referencedRelation: "standings"
            referencedColumns: ["season_id"]
          },
        ]
      }
      sheet_sync_logs: {
        Row: {
          changes: Json
          errors: Json
          id: string
          rows_errored: number
          rows_processed: number
          sheet_config_id: string
          status: string
          synced_at: string
          triggered_by: string
        }
        Insert: {
          changes?: Json
          errors?: Json
          id?: string
          rows_errored?: number
          rows_processed?: number
          sheet_config_id: string
          status: string
          synced_at?: string
          triggered_by: string
        }
        Update: {
          changes?: Json
          errors?: Json
          id?: string
          rows_errored?: number
          rows_processed?: number
          sheet_config_id?: string
          status?: string
          synced_at?: string
          triggered_by?: string
        }
        Relationships: [
          {
            foreignKeyName: "sheet_sync_logs_sheet_config_id_fkey"
            columns: ["sheet_config_id"]
            isOneToOne: false
            referencedRelation: "sheet_configs"
            referencedColumns: ["id"]
          },
        ]
      }
      spec_bonuses: {
        Row: {
          ladder: number[]
          outside: number
          region_id: string
          scope_count: boolean
          scope_pct: boolean
          scope_per_set: boolean
          updated_at: string
          upper_finalist: number
        }
        Insert: {
          ladder?: number[]
          outside?: number
          region_id: string
          scope_count?: boolean
          scope_pct?: boolean
          scope_per_set?: boolean
          updated_at?: string
          upper_finalist?: number
        }
        Update: {
          ladder?: number[]
          outside?: number
          region_id?: string
          scope_count?: boolean
          scope_pct?: boolean
          scope_per_set?: boolean
          updated_at?: string
          upper_finalist?: number
        }
        Relationships: [
          {
            foreignKeyName: "spec_bonuses_region_id_fkey"
            columns: ["region_id"]
            isOneToOne: true
            referencedRelation: "regions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "spec_bonuses_region_id_fkey"
            columns: ["region_id"]
            isOneToOne: true
            referencedRelation: "v_player_leaderboard"
            referencedColumns: ["region_id"]
          },
        ]
      }
      spec_requirements: {
        Row: {
          created_at: string
          id: string
          min_value: number
          spec_id: string
          stat_key: string
          tier: string
        }
        Insert: {
          created_at?: string
          id?: string
          min_value: number
          spec_id: string
          stat_key: string
          tier: string
        }
        Update: {
          created_at?: string
          id?: string
          min_value?: number
          spec_id?: string
          stat_key?: string
          tier?: string
        }
        Relationships: [
          {
            foreignKeyName: "spec_requirements_spec_id_fkey"
            columns: ["spec_id"]
            isOneToOne: false
            referencedRelation: "specs"
            referencedColumns: ["id"]
          },
        ]
      }
      spec_winners: {
        Row: {
          created_at: string
          id: string
          player_id: string
          season_id: string
          spec_id: string
          stars_awarded: number
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          player_id: string
          season_id: string
          spec_id: string
          stars_awarded: number
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          player_id?: string
          season_id?: string
          spec_id?: string
          stars_awarded?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "spec_winners_player_id_fkey"
            columns: ["player_id"]
            isOneToOne: false
            referencedRelation: "players"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "spec_winners_player_id_fkey"
            columns: ["player_id"]
            isOneToOne: false
            referencedRelation: "v_leaderboard_identity"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "spec_winners_season_id_fkey"
            columns: ["season_id"]
            isOneToOne: false
            referencedRelation: "seasons"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "spec_winners_season_id_fkey"
            columns: ["season_id"]
            isOneToOne: false
            referencedRelation: "standings"
            referencedColumns: ["season_id"]
          },
          {
            foreignKeyName: "spec_winners_spec_id_fkey"
            columns: ["spec_id"]
            isOneToOne: false
            referencedRelation: "specs"
            referencedColumns: ["id"]
          },
        ]
      }
      specs: {
        Row: {
          created_at: string
          height: number
          id: string
          name: string
          position: string
          secondary_required: number
          stars: number
          updated_at: string
        }
        Insert: {
          created_at?: string
          height?: number
          id?: string
          name: string
          position?: string
          secondary_required?: number
          stars: number
          updated_at?: string
        }
        Update: {
          created_at?: string
          height?: number
          id?: string
          name?: string
          position?: string
          secondary_required?: number
          stars?: number
          updated_at?: string
        }
        Relationships: []
      }
      team_name_history: {
        Row: {
          changed_at: string
          id: string
          new_name: string
          old_name: string
          team_id: string
        }
        Insert: {
          changed_at?: string
          id?: string
          new_name: string
          old_name: string
          team_id: string
        }
        Update: {
          changed_at?: string
          id?: string
          new_name?: string
          old_name?: string
          team_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "team_name_history_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "standings"
            referencedColumns: ["team_id"]
          },
          {
            foreignKeyName: "team_name_history_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "team_name_history_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "v_player_leaderboard"
            referencedColumns: ["team_id"]
          },
        ]
      }
      teams: {
        Row: {
          brick_color: string | null
          brick_number: number | null
          created_at: string
          deleted_at: string | null
          id: string
          is_bye: boolean
          logo_bg_removed: boolean
          logo_url: string | null
          name: string
          previous_team_id: string | null
          season_id: string
          slug: string
          starting_lvr: number
          starting_points: number
          team_number: number | null
          updated_at: string
        }
        Insert: {
          brick_color?: string | null
          brick_number?: number | null
          created_at?: string
          deleted_at?: string | null
          id?: string
          is_bye?: boolean
          logo_bg_removed?: boolean
          logo_url?: string | null
          name: string
          previous_team_id?: string | null
          season_id: string
          slug: string
          starting_lvr?: number
          starting_points?: number
          team_number?: number | null
          updated_at?: string
        }
        Update: {
          brick_color?: string | null
          brick_number?: number | null
          created_at?: string
          deleted_at?: string | null
          id?: string
          is_bye?: boolean
          logo_bg_removed?: boolean
          logo_url?: string | null
          name?: string
          previous_team_id?: string | null
          season_id?: string
          slug?: string
          starting_lvr?: number
          starting_points?: number
          team_number?: number | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "teams_previous_team_id_fkey"
            columns: ["previous_team_id"]
            isOneToOne: false
            referencedRelation: "standings"
            referencedColumns: ["team_id"]
          },
          {
            foreignKeyName: "teams_previous_team_id_fkey"
            columns: ["previous_team_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "teams_previous_team_id_fkey"
            columns: ["previous_team_id"]
            isOneToOne: false
            referencedRelation: "v_player_leaderboard"
            referencedColumns: ["team_id"]
          },
          {
            foreignKeyName: "teams_season_id_fkey"
            columns: ["season_id"]
            isOneToOne: false
            referencedRelation: "seasons"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "teams_season_id_fkey"
            columns: ["season_id"]
            isOneToOne: false
            referencedRelation: "standings"
            referencedColumns: ["season_id"]
          },
        ]
      }
      user_roles: {
        Row: {
          created_at: string | null
          id: string
          promoted_at: string | null
          promoted_by: string | null
          role: string | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          promoted_at?: string | null
          promoted_by?: string | null
          role?: string | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          promoted_at?: string | null
          promoted_by?: string | null
          role?: string | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      standings: {
        Row: {
          last_round_point_diff: number | null
          losses: number | null
          rank: number | null
          region_id: string | null
          season_id: string | null
          sets_lost: number | null
          sets_won: number | null
          starting_lvr: number | null
          starting_points: number | null
          team_id: string | null
          team_logo_bg_removed: boolean | null
          team_logo_url: string | null
          team_name: string | null
          team_slug: string | null
          total_bonus: number | null
          total_lvr: number | null
          total_points: number | null
          wins: number | null
        }
        Relationships: [
          {
            foreignKeyName: "seasons_region_id_fkey"
            columns: ["region_id"]
            isOneToOne: false
            referencedRelation: "regions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "seasons_region_id_fkey"
            columns: ["region_id"]
            isOneToOne: false
            referencedRelation: "v_player_leaderboard"
            referencedColumns: ["region_id"]
          },
        ]
      }
      v_leaderboard_identity: {
        Row: {
          avatar_url: string | null
          display_name: string | null
          id: string | null
          username: string | null
        }
        Relationships: []
      }
      v_matches_with_stats: {
        Row: {
          match_id: string | null
        }
        Relationships: [
          {
            foreignKeyName: "player_stats_match_id_fkey"
            columns: ["match_id"]
            isOneToOne: false
            referencedRelation: "matches"
            referencedColumns: ["id"]
          },
        ]
      }
      v_player_leaderboard: {
        Row: {
          aces_per_set: number | null
          aces_total: number | null
          ape_attempts_per_set: number | null
          ape_attempts_total: number | null
          ape_kills_per_set: number | null
          ape_kills_total: number | null
          assists_per_set: number | null
          assists_total: number | null
          avatar_url: string | null
          block_follows_per_set: number | null
          block_follows_total: number | null
          block_touches_per_set: number | null
          block_touches_total: number | null
          blocks_per_set: number | null
          blocks_total: number | null
          delay_kills_per_set: number | null
          delay_kills_total: number | null
          digs_per_set: number | null
          digs_total: number | null
          display_name: string | null
          dives_per_set: number | null
          dives_total: number | null
          errors_per_set: number | null
          errors_total: number | null
          float_aces_per_set: number | null
          float_aces_total: number | null
          hit_eff: number | null
          jump_serve_aces_per_set: number | null
          jump_serve_aces_total: number | null
          kb_pct: number | null
          kill_attempts_per_set: number | null
          kill_attempts_total: number | null
          kill_blocks_per_set: number | null
          kill_blocks_total: number | null
          kills_per_set: number | null
          kills_total: number | null
          matches_played: number | null
          misc_errors_per_set: number | null
          misc_errors_total: number | null
          player_id: string | null
          points_per_set: number | null
          points_total: number | null
          quick_kills_per_set: number | null
          quick_kills_total: number | null
          rec_eff: number | null
          receive_errors_total: number | null
          receives_per_set: number | null
          receives_total: number | null
          region_code: string | null
          region_id: string | null
          season_id: string | null
          season_name: string | null
          season_slug: string | null
          season_start_date: string | null
          serve_receives_per_set: number | null
          serve_receives_total: number | null
          service_errors_per_set: number | null
          service_errors_total: number | null
          service_score: number | null
          set_eff: number | null
          sets_played: number | null
          setting_errors_per_set: number | null
          setting_errors_total: number | null
          spiking_errors_per_set: number | null
          spiking_errors_total: number | null
          team_id: string | null
          team_logo_bg_removed: boolean | null
          team_logo_url: string | null
          team_name: string | null
          team_slug: string | null
          username: string | null
          wipes_tools_per_set: number | null
          wipes_tools_total: number | null
        }
        Relationships: []
      }
      v_player_match_stat_sets: {
        Row: {
          aces: number | null
          ape_attempts: number | null
          ape_kills: number | null
          assists: number | null
          avatar_url: string | null
          block_follows: number | null
          block_touches: number | null
          contributions: number | null
          delay_kills: number | null
          digs: number | null
          display_name: string | null
          dives: number | null
          float_aces: number | null
          hit_eff: number | null
          jump_serve_aces: number | null
          kb_pct: number | null
          kill_attempts: number | null
          kill_blocks: number | null
          match_id: string | null
          misc_errors: number | null
          player_id: string | null
          points: number | null
          position: string | null
          quick_kills: number | null
          receive_errors: number | null
          serve_receives: number | null
          service_errors: number | null
          service_score: number | null
          set_eff: number | null
          set_number: number | null
          setting_errors: number | null
          spiking_errors: number | null
          team_id: string | null
          team_name: string | null
          total_aces: number | null
          total_attempts: number | null
          total_blocks: number | null
          total_errors: number | null
          total_kills: number | null
          total_receives: number | null
          username: string | null
          wipes_tools: number | null
        }
        Relationships: [
          {
            foreignKeyName: "player_stats_match_id_fkey"
            columns: ["match_id"]
            isOneToOne: false
            referencedRelation: "matches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "player_stats_player_id_fkey"
            columns: ["player_id"]
            isOneToOne: false
            referencedRelation: "players"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "player_stats_player_id_fkey"
            columns: ["player_id"]
            isOneToOne: false
            referencedRelation: "v_leaderboard_identity"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "player_stats_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "standings"
            referencedColumns: ["team_id"]
          },
          {
            foreignKeyName: "player_stats_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "player_stats_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "v_player_leaderboard"
            referencedColumns: ["team_id"]
          },
        ]
      }
      v_player_match_stat_totals: {
        Row: {
          aces: number | null
          ape_attempts: number | null
          ape_kills: number | null
          assists: number | null
          avatar_url: string | null
          block_follows: number | null
          block_touches: number | null
          contributions: number | null
          delay_kills: number | null
          digs: number | null
          display_name: string | null
          dives: number | null
          float_aces: number | null
          hit_eff: number | null
          jump_serve_aces: number | null
          kb_pct: number | null
          kill_attempts: number | null
          kill_blocks: number | null
          match_id: string | null
          misc_errors: number | null
          player_id: string | null
          points: number | null
          quick_kills: number | null
          receive_errors: number | null
          serve_receives: number | null
          service_errors: number | null
          service_score: number | null
          set_eff: number | null
          sets_played: number | null
          setting_errors: number | null
          spiking_errors: number | null
          team_id: string | null
          team_name: string | null
          total_aces: number | null
          total_attempts: number | null
          total_blocks: number | null
          total_errors: number | null
          total_kills: number | null
          total_receives: number | null
          username: string | null
          wipes_tools: number | null
        }
        Relationships: [
          {
            foreignKeyName: "player_stats_match_id_fkey"
            columns: ["match_id"]
            isOneToOne: false
            referencedRelation: "matches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "player_stats_player_id_fkey"
            columns: ["player_id"]
            isOneToOne: false
            referencedRelation: "players"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "player_stats_player_id_fkey"
            columns: ["player_id"]
            isOneToOne: false
            referencedRelation: "v_leaderboard_identity"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "player_stats_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "standings"
            referencedColumns: ["team_id"]
          },
          {
            foreignKeyName: "player_stats_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "player_stats_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "v_player_leaderboard"
            referencedColumns: ["team_id"]
          },
        ]
      }
      v_player_season_stats: {
        Row: {
          aces_per_set: number | null
          aces_total: number | null
          ape_attempts_per_set: number | null
          ape_attempts_total: number | null
          ape_kills_per_set: number | null
          ape_kills_total: number | null
          assists_per_set: number | null
          assists_total: number | null
          block_follows_per_set: number | null
          block_follows_total: number | null
          block_touches_per_set: number | null
          block_touches_total: number | null
          blocks_per_set: number | null
          blocks_total: number | null
          delay_kills_per_set: number | null
          delay_kills_total: number | null
          digs_per_set: number | null
          digs_total: number | null
          dives_per_set: number | null
          dives_total: number | null
          errors_per_set: number | null
          errors_total: number | null
          float_aces_per_set: number | null
          float_aces_total: number | null
          hit_eff: number | null
          jump_serve_aces_per_set: number | null
          jump_serve_aces_total: number | null
          kb_pct: number | null
          kill_attempts_per_set: number | null
          kill_attempts_total: number | null
          kill_blocks_per_set: number | null
          kill_blocks_total: number | null
          kills_per_set: number | null
          kills_total: number | null
          matches_played: number | null
          misc_errors_per_set: number | null
          misc_errors_total: number | null
          player_id: string | null
          points_per_set: number | null
          points_total: number | null
          quick_kills_per_set: number | null
          quick_kills_total: number | null
          rec_eff: number | null
          receive_errors_total: number | null
          receives_per_set: number | null
          receives_total: number | null
          season_id: string | null
          serve_receives_per_set: number | null
          serve_receives_total: number | null
          service_errors_per_set: number | null
          service_errors_total: number | null
          service_score: number | null
          set_eff: number | null
          sets_played: number | null
          setting_errors_per_set: number | null
          setting_errors_total: number | null
          spiking_errors_per_set: number | null
          spiking_errors_total: number | null
          wipes_tools_per_set: number | null
          wipes_tools_total: number | null
        }
        Relationships: []
      }
    }
    Functions: {
      advance_playoff_winner: {
        Args: { p_match_id: string }
        Returns: undefined
      }
      bump_cache_version: { Args: { p_tag: string }; Returns: undefined }
      complete_match: {
        Args: {
          p_away_bonus?: number
          p_away_lvr?: number
          p_away_points?: number
          p_away_sets_won: number
          p_home_bonus?: number
          p_home_lvr?: number
          p_home_points?: number
          p_home_sets_won: number
          p_is_forfeit?: boolean
          p_loser_mvp_player_id?: string
          p_match_id: string
          p_mvp_player_id?: string
          p_point_diff?: number
          p_scheduled_at?: string
          p_sets: Json
        }
        Returns: {
          away_sets_won: number | null
          away_team_bonus: number | null
          away_team_id: string | null
          away_team_lvr: number | null
          away_team_points: number | null
          best_of: number
          created_at: string
          home_sets_won: number | null
          home_team_bonus: number | null
          home_team_id: string | null
          home_team_lvr: number | null
          home_team_points: number | null
          id: string
          is_forfeit: boolean | null
          loser_mvp_player_id: string | null
          match_code: string | null
          match_mvp_player_id: string | null
          match_type: Database["public"]["Enums"]["match_type"]
          point_diff: number | null
          scheduled_at: string | null
          season_id: string
          status: Database["public"]["Enums"]["match_status"]
          updated_at: string
          week: number | null
        }
        SetofOptions: {
          from: "*"
          to: "matches"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      get_player_raw_stat_totals: {
        Args: { p_roblox_user_id: number; p_season_number?: number }
        Returns: {
          ape_attempts: number
          ape_kills: number
          assists: number
          block_follows: number
          block_touches: number
          delay_kills: number
          digs: number
          dives: number
          float_aces: number
          jump_serve_aces: number
          kill_attempts: number
          kill_blocks: number
          quick_kills: number
          receive_errors: number
          receives: number
          service_errors: number
          sets_played: number
          setting_errors: number
          spiking_errors: number
          wipes_tools: number
        }[]
      }
      get_player_season_stats_ranged: {
        Args: { p_from?: string; p_season_id?: string; p_to?: string }
        Returns: {
          aces_per_set: number
          aces_total: number
          ape_attempts_per_set: number
          ape_attempts_total: number
          ape_kills_per_set: number
          ape_kills_total: number
          assists_per_set: number
          assists_total: number
          block_follows_per_set: number
          block_follows_total: number
          block_touches_per_set: number
          block_touches_total: number
          blocks_per_set: number
          blocks_total: number
          delay_kills_per_set: number
          delay_kills_total: number
          digs_per_set: number
          digs_total: number
          dives_per_set: number
          dives_total: number
          errors_per_set: number
          errors_total: number
          float_aces_per_set: number
          float_aces_total: number
          hit_eff: number
          jump_serve_aces_per_set: number
          jump_serve_aces_total: number
          kb_pct: number
          kill_attempts_per_set: number
          kill_attempts_total: number
          kill_blocks_per_set: number
          kill_blocks_total: number
          kills_per_set: number
          kills_total: number
          matches_played: number
          misc_errors_per_set: number
          misc_errors_total: number
          player_id: string
          points_per_set: number
          points_total: number
          quick_kills_per_set: number
          quick_kills_total: number
          rec_eff: number
          receive_errors_total: number
          receives_per_set: number
          receives_total: number
          season_id: string
          serve_receives_per_set: number
          serve_receives_total: number
          service_errors_per_set: number
          service_errors_total: number
          service_score: number
          set_eff: number
          sets_played: number
          setting_errors_per_set: number
          setting_errors_total: number
          spiking_errors_per_set: number
          spiking_errors_total: number
          wipes_tools_per_set: number
          wipes_tools_total: number
        }[]
      }
      get_player_season_stats_scoped: {
        Args: {
          p_from?: string
          p_position?: string
          p_season_id?: string
          p_to?: string
        }
        Returns: {
          aces_per_set: number
          aces_total: number
          ape_attempts_per_set: number
          ape_attempts_total: number
          ape_kills_per_set: number
          ape_kills_total: number
          assists_per_set: number
          assists_total: number
          block_follows_per_set: number
          block_follows_total: number
          block_touches_per_set: number
          block_touches_total: number
          blocks_per_set: number
          blocks_total: number
          delay_kills_per_set: number
          delay_kills_total: number
          digs_per_set: number
          digs_total: number
          dives_per_set: number
          dives_total: number
          errors_per_set: number
          errors_total: number
          float_aces_per_set: number
          float_aces_total: number
          hit_eff: number
          jump_serve_aces_per_set: number
          jump_serve_aces_total: number
          kb_pct: number
          kill_attempts_per_set: number
          kill_attempts_total: number
          kill_blocks_per_set: number
          kill_blocks_total: number
          kills_per_set: number
          kills_total: number
          matches_played: number
          misc_errors_per_set: number
          misc_errors_total: number
          player_id: string
          points_per_set: number
          points_total: number
          quick_kills_per_set: number
          quick_kills_total: number
          rec_eff: number
          receive_errors_total: number
          receives_per_set: number
          receives_total: number
          season_id: string
          serve_receives_per_set: number
          serve_receives_total: number
          service_errors_per_set: number
          service_errors_total: number
          service_score: number
          set_eff: number
          sets_played: number
          setting_errors_per_set: number
          setting_errors_total: number
          spiking_errors_per_set: number
          spiking_errors_total: number
          wipes_tools_per_set: number
          wipes_tools_total: number
        }[]
      }
      get_raw_stat_summary: {
        Args: { p_season_number?: number }
        Returns: {
          aces_per_set_max: number
          aces_per_set_mean: number
          aces_per_set_min: number
          ape_attempts_max: number
          ape_attempts_mean: number
          ape_attempts_min: number
          ape_kills_max: number
          ape_kills_mean: number
          ape_kills_min: number
          assists_max: number
          assists_mean: number
          assists_min: number
          assists_per_set_max: number
          assists_per_set_mean: number
          assists_per_set_min: number
          block_follows_max: number
          block_follows_mean: number
          block_follows_min: number
          block_touches_max: number
          block_touches_mean: number
          block_touches_min: number
          blocks_per_set_max: number
          blocks_per_set_mean: number
          blocks_per_set_min: number
          delay_kills_max: number
          delay_kills_mean: number
          delay_kills_min: number
          digs_max: number
          digs_mean: number
          digs_min: number
          dives_max: number
          dives_mean: number
          dives_min: number
          float_aces_max: number
          float_aces_mean: number
          float_aces_min: number
          hit_pct_max: number
          hit_pct_mean: number
          hit_pct_min: number
          jump_serve_aces_max: number
          jump_serve_aces_mean: number
          jump_serve_aces_min: number
          kb_pct_max: number
          kb_pct_mean: number
          kb_pct_min: number
          kill_attempts_max: number
          kill_attempts_mean: number
          kill_attempts_min: number
          kill_blocks_max: number
          kill_blocks_mean: number
          kill_blocks_min: number
          kills_per_set_max: number
          kills_per_set_mean: number
          kills_per_set_min: number
          points_per_set_max: number
          points_per_set_mean: number
          points_per_set_min: number
          quick_kills_max: number
          quick_kills_mean: number
          quick_kills_min: number
          rec_pct_max: number
          rec_pct_mean: number
          rec_pct_min: number
          receive_errors_max: number
          receive_errors_mean: number
          receive_errors_min: number
          receives_max: number
          receives_mean: number
          receives_min: number
          receives_per_set_max: number
          receives_per_set_mean: number
          receives_per_set_min: number
          service_errors_max: number
          service_errors_mean: number
          service_errors_min: number
          set_pct_max: number
          set_pct_mean: number
          set_pct_min: number
          sets_played_max: number
          sets_played_mean: number
          sets_played_min: number
          setting_errors_max: number
          setting_errors_mean: number
          setting_errors_min: number
          spiking_errors_max: number
          spiking_errors_mean: number
          spiking_errors_min: number
          wipes_tools_max: number
          wipes_tools_mean: number
          wipes_tools_min: number
        }[]
      }
      get_user_role: { Args: { check_user_id: string }; Returns: string }
      has_role: { Args: { check_user_id: string }; Returns: boolean }
      readvance_playoff_match: {
        Args: { p_match_id: string }
        Returns: {
          away_sets_won: number | null
          away_team_bonus: number | null
          away_team_id: string | null
          away_team_lvr: number | null
          away_team_points: number | null
          best_of: number
          created_at: string
          home_sets_won: number | null
          home_team_bonus: number | null
          home_team_id: string | null
          home_team_lvr: number | null
          home_team_points: number | null
          id: string
          is_forfeit: boolean | null
          loser_mvp_player_id: string | null
          match_code: string | null
          match_mvp_player_id: string | null
          match_type: Database["public"]["Enums"]["match_type"]
          point_diff: number | null
          scheduled_at: string | null
          season_id: string
          status: Database["public"]["Enums"]["match_status"]
          updated_at: string
          week: number | null
        }
        SetofOptions: {
          from: "*"
          to: "matches"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      reapply_match_result: {
        Args: {
          p_away_bonus?: number
          p_away_lvr?: number
          p_away_points?: number
          p_away_sets_won: number
          p_home_bonus?: number
          p_home_lvr?: number
          p_home_points?: number
          p_home_sets_won: number
          p_is_forfeit?: boolean
          p_loser_mvp_player_id?: string
          p_match_id: string
          p_mvp_player_id?: string
          p_point_diff?: number
          p_sets: Json
        }
        Returns: {
          away_sets_won: number | null
          away_team_bonus: number | null
          away_team_id: string | null
          away_team_lvr: number | null
          away_team_points: number | null
          best_of: number
          created_at: string
          home_sets_won: number | null
          home_team_bonus: number | null
          home_team_id: string | null
          home_team_lvr: number | null
          home_team_points: number | null
          id: string
          is_forfeit: boolean | null
          loser_mvp_player_id: string | null
          match_code: string | null
          match_mvp_player_id: string | null
          match_type: Database["public"]["Enums"]["match_type"]
          point_diff: number | null
          scheduled_at: string | null
          season_id: string
          status: Database["public"]["Enums"]["match_status"]
          updated_at: string
          week: number | null
        }
        SetofOptions: {
          from: "*"
          to: "matches"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      replace_match_player_stats: {
        Args: { p_match_id: string; p_rows: Json }
        Returns: undefined
      }
      search_players_with_similarity: {
        Args: { search_term: string }
        Returns: {
          avatar_url: string
          display_name: string
          id: string
          roblox_user_id: string
          similarity_score: number
          username: string
        }[]
      }
      show_limit: { Args: never; Returns: number }
      show_trgm: { Args: { "": string }; Returns: string[] }
      void_match: {
        Args: { p_match_id: string }
        Returns: {
          away_sets_won: number | null
          away_team_bonus: number | null
          away_team_id: string | null
          away_team_lvr: number | null
          away_team_points: number | null
          best_of: number
          created_at: string
          home_sets_won: number | null
          home_team_bonus: number | null
          home_team_id: string | null
          home_team_lvr: number | null
          home_team_points: number | null
          id: string
          is_forfeit: boolean | null
          loser_mvp_player_id: string | null
          match_code: string | null
          match_mvp_player_id: string | null
          match_type: Database["public"]["Enums"]["match_type"]
          point_diff: number | null
          scheduled_at: string | null
          season_id: string
          status: Database["public"]["Enums"]["match_status"]
          updated_at: string
          week: number | null
        }
        SetofOptions: {
          from: "*"
          to: "matches"
          isOneToOne: true
          isSetofReturn: false
        }
      }
    }
    Enums: {
      award_category:
        | "individual_winners"
        | "first_team"
        | "staff_team"
        | "champion_roster"
      match_status: "pending" | "scheduled" | "completed"
      match_type: "season" | "playoffs"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never) = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never) = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  graphql_public: {
    Enums: {},
  },
  public: {
    Enums: {
      award_category: [
        "individual_winners",
        "first_team",
        "staff_team",
        "champion_roster",
      ],
      match_status: ["pending", "scheduled", "completed"],
      match_type: ["season", "playoffs"],
    },
  },
} as const
