


SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;


COMMENT ON SCHEMA "public" IS 'standard public schema';



CREATE EXTENSION IF NOT EXISTS "pg_graphql" WITH SCHEMA "graphql";






CREATE EXTENSION IF NOT EXISTS "pg_stat_statements" WITH SCHEMA "extensions";






CREATE EXTENSION IF NOT EXISTS "pg_trgm" WITH SCHEMA "public";






CREATE EXTENSION IF NOT EXISTS "pgcrypto" WITH SCHEMA "extensions";






CREATE EXTENSION IF NOT EXISTS "supabase_vault" WITH SCHEMA "vault";






CREATE EXTENSION IF NOT EXISTS "uuid-ossp" WITH SCHEMA "extensions";






CREATE TYPE "public"."award_category" AS ENUM (
    'individual_winners',
    'first_team',
    'staff_team',
    'champion_roster'
);


ALTER TYPE "public"."award_category" OWNER TO "postgres";


CREATE TYPE "public"."match_status" AS ENUM (
    'pending',
    'scheduled',
    'completed'
);


ALTER TYPE "public"."match_status" OWNER TO "postgres";


CREATE TYPE "public"."match_type" AS ENUM (
    'season',
    'playoffs'
);


ALTER TYPE "public"."match_type" OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."advance_playoff_winner"("p_match_id" "uuid") RETURNS "void"
    LANGUAGE "plpgsql"
    AS $$
DECLARE
  v_bracket  playoff_brackets%ROWTYPE;
  v_match    matches%ROWTYPE;
  v_winner_team_id uuid;
  v_loser_team_id  uuid;
  v_winner_seed    int;
  v_loser_seed     int;
  v_next_match_id  uuid;
  -- Fix #4 will need a row var to re-inspect each target match after filling it:
  v_next_match matches%ROWTYPE;
BEGIN
  SELECT * INTO v_bracket FROM playoff_brackets WHERE match_id = p_match_id;
  IF NOT FOUND THEN RETURN; END IF;

  SELECT * INTO v_match FROM matches WHERE id = p_match_id;

  IF v_match.home_sets_won > v_match.away_sets_won THEN
    v_winner_team_id := v_match.home_team_id;
    v_loser_team_id  := v_match.away_team_id;
    v_winner_seed    := v_bracket.seed_home;
    v_loser_seed     := v_bracket.seed_away;
  ELSE
    v_winner_team_id := v_match.away_team_id;
    v_loser_team_id  := v_match.home_team_id;
    v_winner_seed    := v_bracket.seed_away;
    v_loser_seed     := v_bracket.seed_home;
  END IF;

  IF v_bracket.round = 'grand_final' AND v_match.home_sets_won > v_match.away_sets_won THEN RETURN; END IF;

  IF v_bracket.next_bracket_id IS NOT NULL THEN
    SELECT match_id INTO v_next_match_id
      FROM playoff_brackets WHERE id = v_bracket.next_bracket_id;

    UPDATE matches SET
      home_team_id = CASE WHEN v_bracket.winner_position = 'home' THEN v_winner_team_id ELSE home_team_id END,
      away_team_id = CASE WHEN v_bracket.winner_position = 'away' THEN v_winner_team_id ELSE away_team_id END
    WHERE id = v_next_match_id;

    UPDATE playoff_brackets SET
      seed_home = CASE WHEN v_bracket.winner_position = 'home' THEN v_winner_seed ELSE seed_home END,
      seed_away = CASE WHEN v_bracket.winner_position = 'away' THEN v_winner_seed ELSE seed_away END
    WHERE id = v_bracket.next_bracket_id;

    SELECT * into v_next_match FROM matches WHERE id = v_next_match_id;
    IF v_next_match.status = 'completed'
     AND v_next_match.home_team_id IS NOT NULL 
     AND v_next_match.away_team_id IS NOT NULL 
     THEN PERFORM advance_playoff_winner(v_next_match_id); END IF;
  END IF;

  IF v_bracket.loser_next_bracket_id IS NOT NULL THEN
    SELECT match_id INTO v_next_match_id
      FROM playoff_brackets WHERE id = v_bracket.loser_next_bracket_id;

    UPDATE matches SET
      home_team_id = CASE WHEN v_bracket.loser_position = 'home' THEN v_loser_team_id ELSE home_team_id END,
      away_team_id = CASE WHEN v_bracket.loser_position = 'away' THEN v_loser_team_id ELSE away_team_id END
    WHERE id = v_next_match_id;

    UPDATE playoff_brackets SET
      seed_home = CASE WHEN v_bracket.loser_position = 'home' THEN v_loser_seed ELSE seed_home END,
      seed_away = CASE WHEN v_bracket.loser_position = 'away' THEN v_loser_seed ELSE seed_away END
    WHERE id = v_bracket.loser_next_bracket_id;

    SELECT * into v_next_match FROM matches WHERE id = v_next_match_id;
    IF v_next_match.status = 'completed'
     AND v_next_match.home_team_id IS NOT NULL 
     AND v_next_match.away_team_id IS NOT NULL 
     THEN PERFORM advance_playoff_winner(v_next_match_id); END IF;
  END IF;
END;
$$;


ALTER FUNCTION "public"."advance_playoff_winner"("p_match_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."bump_cache_version"("p_tag" "text") RETURNS "void"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
begin
  insert into cache_versions (tag)
  values (p_tag)
  on conflict (tag) do update
    set version = cache_versions.version + 1,
        updated_at = now();
end;
$$;


ALTER FUNCTION "public"."bump_cache_version"("p_tag" "text") OWNER TO "postgres";

SET default_tablespace = '';

SET default_table_access_method = "heap";


CREATE TABLE IF NOT EXISTS "public"."matches" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "season_id" "uuid" NOT NULL,
    "home_team_id" "uuid",
    "away_team_id" "uuid",
    "scheduled_at" timestamp with time zone,
    "week" integer,
    "status" "public"."match_status" DEFAULT 'pending'::"public"."match_status" NOT NULL,
    "match_type" "public"."match_type" DEFAULT 'season'::"public"."match_type" NOT NULL,
    "home_sets_won" integer DEFAULT 0,
    "away_sets_won" integer DEFAULT 0,
    "home_team_lvr" numeric(10,2),
    "away_team_lvr" numeric(10,2),
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "match_mvp_player_id" "uuid",
    "loser_mvp_player_id" "uuid",
    "best_of" integer DEFAULT 3 NOT NULL,
    "is_forfeit" boolean DEFAULT false,
    "match_code" "text",
    "home_team_points" numeric,
    "away_team_points" numeric,
    "home_team_bonus" numeric DEFAULT 0,
    "away_team_bonus" numeric DEFAULT 0,
    "point_diff" numeric,
    CONSTRAINT "chk_different_teams" CHECK (("home_team_id" <> "away_team_id")),
    CONSTRAINT "matches_best_of_check" CHECK (("best_of" = ANY (ARRAY[3, 5])))
);


ALTER TABLE "public"."matches" OWNER TO "postgres";


COMMENT ON COLUMN "public"."matches"."match_mvp_player_id" IS 'Player awarded MVP for the winning team';



COMMENT ON COLUMN "public"."matches"."loser_mvp_player_id" IS 'Player awarded MVP for the losing team';



CREATE OR REPLACE FUNCTION "public"."complete_match"("p_match_id" "uuid", "p_sets" "jsonb", "p_home_sets_won" integer, "p_away_sets_won" integer, "p_home_lvr" numeric DEFAULT NULL::numeric, "p_away_lvr" numeric DEFAULT NULL::numeric, "p_home_points" numeric DEFAULT NULL::numeric, "p_away_points" numeric DEFAULT NULL::numeric, "p_home_bonus" numeric DEFAULT NULL::numeric, "p_away_bonus" numeric DEFAULT NULL::numeric, "p_point_diff" numeric DEFAULT NULL::numeric, "p_mvp_player_id" "uuid" DEFAULT NULL::"uuid", "p_loser_mvp_player_id" "uuid" DEFAULT NULL::"uuid", "p_is_forfeit" boolean DEFAULT false, "p_scheduled_at" timestamp with time zone DEFAULT NULL::timestamp with time zone) RETURNS "public"."matches"
    LANGUAGE "plpgsql"
    AS $$
DECLARE
  v_match matches%ROWTYPE;
BEGIN
  INSERT INTO match_sets (match_id, set_number, home_score, away_score)
  SELECT
    p_match_id,
    (s->>'set_number')::int,
    (s->>'home_score')::int,
    (s->>'away_score')::int
  FROM jsonb_array_elements(p_sets) AS s;

  UPDATE matches SET
    status               = 'completed',
    home_sets_won        = p_home_sets_won,
    away_sets_won        = p_away_sets_won,
    home_team_lvr        = p_home_lvr,
    away_team_lvr        = p_away_lvr,
    home_team_points     = p_home_points,
    away_team_points     = p_away_points,
    home_team_bonus      = p_home_bonus,
    away_team_bonus      = p_away_bonus,
    point_diff           = p_point_diff,
    match_mvp_player_id  = p_mvp_player_id,
    loser_mvp_player_id  = p_loser_mvp_player_id,
    is_forfeit           = p_is_forfeit,
    scheduled_at         = p_scheduled_at
  WHERE id = p_match_id;

  SELECT * INTO v_match FROM matches WHERE id = p_match_id;

  IF v_match.match_type = 'playoffs'
     AND v_match.home_team_id IS NOT NULL
     AND v_match.away_team_id IS NOT NULL
  THEN
    PERFORM advance_playoff_winner(p_match_id);
  END IF;

  SELECT * INTO v_match FROM matches WHERE id = p_match_id;
  RETURN v_match;
END;
$$;


ALTER FUNCTION "public"."complete_match"("p_match_id" "uuid", "p_sets" "jsonb", "p_home_sets_won" integer, "p_away_sets_won" integer, "p_home_lvr" numeric, "p_away_lvr" numeric, "p_home_points" numeric, "p_away_points" numeric, "p_home_bonus" numeric, "p_away_bonus" numeric, "p_point_diff" numeric, "p_mvp_player_id" "uuid", "p_loser_mvp_player_id" "uuid", "p_is_forfeit" boolean, "p_scheduled_at" timestamp with time zone) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_player_raw_stat_totals"("p_roblox_user_id" "text", "p_season_number" integer DEFAULT NULL::integer) RETURNS TABLE("sets_played" numeric, "ape_kills" integer, "ape_attempts" integer, "delay_kills" integer, "quick_kills" integer, "wipes_tools" integer, "kill_attempts" integer, "spiking_errors" integer, "assists" integer, "setting_errors" integer, "kill_blocks" integer, "block_touches" integer, "digs" integer, "block_follows" integer, "dives" integer, "receive_errors" integer, "receives" integer, "jump_serve_aces" integer, "float_aces" integer, "service_errors" integer)
    LANGUAGE "sql" STABLE
    AS $$
    SELECT
        COALESCE(SUM(CASE WHEN pms.set_number = 5 THEN 0.5 ELSE 1 END), 0)::numeric,
        COALESCE(SUM(pms.ape_kills), 0)::int, COALESCE(SUM(pms.ape_attempts), 0)::int,
        COALESCE(SUM(pms.delay_kills), 0)::int, COALESCE(SUM(pms.quick_kills), 0)::int,
        COALESCE(SUM(pms.wipes_tools), 0)::int, COALESCE(SUM(pms.kill_attempts), 0)::int,
        COALESCE(SUM(pms.spiking_errors), 0)::int,
        COALESCE(SUM(pms.assists), 0)::int, COALESCE(SUM(pms.setting_errors), 0)::int,
        COALESCE(SUM(pms.kill_blocks), 0)::int, COALESCE(SUM(pms.block_touches), 0)::int,
        COALESCE(SUM(pms.digs), 0)::int, COALESCE(SUM(pms.block_follows), 0)::int,
        COALESCE(SUM(pms.dives), 0)::int, COALESCE(SUM(pms.receive_errors), 0)::int,
        COALESCE(SUM(pms.serve_receives + pms.digs + pms.block_follows + pms.dives), 0)::int,
        COALESCE(SUM(pms.jump_serve_aces + pms.aces), 0)::int, COALESCE(SUM(pms.float_aces), 0)::int,
        COALESCE(SUM(pms.service_errors), 0)::int
    FROM "public"."player_match_stats" pms
    JOIN "public"."players" pl ON pl.id = pms.player_id
    JOIN "public"."matches" m ON m.id = pms.match_id
    JOIN "public"."seasons" s ON s.id = m.season_id
    WHERE pl.roblox_user_id = p_roblox_user_id::bigint
      AND m.status = 'completed'
      AND (p_season_number IS NULL OR s.season_number = p_season_number)
      AND (
        pms.ape_kills + pms.ape_attempts + pms.delay_kills + pms.quick_kills +
        pms.wipes_tools + pms.kill_attempts + pms.spiking_errors + pms.assists +
        pms.setting_errors + pms.kill_blocks + pms.block_touches + pms.serve_receives +
        pms.digs + pms.block_follows + pms.dives + pms.aces +
        pms.jump_serve_aces + pms.float_aces + pms.service_errors + pms.misc_errors + pms.receive_errors
      ) > 0
$$;


ALTER FUNCTION "public"."get_player_raw_stat_totals"("p_roblox_user_id" "text", "p_season_number" integer) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_player_season_stats_ranged"("p_season_id" "uuid" DEFAULT NULL::"uuid", "p_from" timestamp with time zone DEFAULT NULL::timestamp with time zone, "p_to" timestamp with time zone DEFAULT NULL::timestamp with time zone) RETURNS TABLE("player_id" "uuid", "season_id" "uuid", "sets_played" numeric, "matches_played" integer, "ape_kills_per_set" numeric, "ape_attempts_per_set" numeric, "delay_kills_per_set" numeric, "quick_kills_per_set" numeric, "wipes_tools_per_set" numeric, "kills_per_set" numeric, "kill_attempts_per_set" numeric, "spiking_errors_per_set" numeric, "assists_per_set" numeric, "setting_errors_per_set" numeric, "kill_blocks_per_set" numeric, "block_touches_per_set" numeric, "blocks_per_set" numeric, "serve_receives_per_set" numeric, "digs_per_set" numeric, "block_follows_per_set" numeric, "dives_per_set" numeric, "receives_per_set" numeric, "aces_per_set" numeric, "service_errors_per_set" numeric, "service_score" integer, "misc_errors_per_set" numeric, "errors_per_set" numeric, "hit_eff" numeric, "kb_pct" numeric, "set_eff" numeric, "points_total" integer, "points_per_set" numeric, "kill_blocks_total" integer, "block_touches_total" integer, "assists_total" integer, "setting_errors_total" integer, "serve_receives_total" integer, "digs_total" integer, "block_follows_total" integer, "dives_total" integer, "ape_kills_total" integer, "delay_kills_total" integer, "quick_kills_total" integer, "wipes_tools_total" integer, "spiking_errors_total" integer, "aces_total" integer, "service_errors_total" integer, "kills_total" integer, "blocks_total" integer, "receives_total" integer, "kill_attempts_total" integer, "ape_attempts_total" integer, "misc_errors_total" integer, "receive_errors_total" integer, "rec_eff" numeric, "errors_total" integer, "jump_serve_aces_total" integer, "float_aces_total" integer, "jump_serve_aces_per_set" numeric, "float_aces_per_set" numeric)
    LANGUAGE "sql" STABLE
    AS $$
  SELECT * FROM "public"."get_player_season_stats_scoped"("p_season_id", "p_from", "p_to", NULL);
$$;


ALTER FUNCTION "public"."get_player_season_stats_ranged"("p_season_id" "uuid", "p_from" timestamp with time zone, "p_to" timestamp with time zone) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_player_season_stats_scoped"("p_season_id" "uuid" DEFAULT NULL::"uuid", "p_from" timestamp with time zone DEFAULT NULL::timestamp with time zone, "p_to" timestamp with time zone DEFAULT NULL::timestamp with time zone, "p_position" "text" DEFAULT NULL::"text") RETURNS TABLE("player_id" "uuid", "season_id" "uuid", "sets_played" numeric, "matches_played" integer, "ape_kills_per_set" numeric, "ape_attempts_per_set" numeric, "delay_kills_per_set" numeric, "quick_kills_per_set" numeric, "wipes_tools_per_set" numeric, "kills_per_set" numeric, "kill_attempts_per_set" numeric, "spiking_errors_per_set" numeric, "assists_per_set" numeric, "setting_errors_per_set" numeric, "kill_blocks_per_set" numeric, "block_touches_per_set" numeric, "blocks_per_set" numeric, "serve_receives_per_set" numeric, "digs_per_set" numeric, "block_follows_per_set" numeric, "dives_per_set" numeric, "receives_per_set" numeric, "aces_per_set" numeric, "service_errors_per_set" numeric, "service_score" integer, "misc_errors_per_set" numeric, "errors_per_set" numeric, "hit_eff" numeric, "kb_pct" numeric, "set_eff" numeric, "points_total" integer, "points_per_set" numeric, "kill_blocks_total" integer, "block_touches_total" integer, "assists_total" integer, "setting_errors_total" integer, "serve_receives_total" integer, "digs_total" integer, "block_follows_total" integer, "dives_total" integer, "ape_kills_total" integer, "delay_kills_total" integer, "quick_kills_total" integer, "wipes_tools_total" integer, "spiking_errors_total" integer, "aces_total" integer, "service_errors_total" integer, "kills_total" integer, "blocks_total" integer, "receives_total" integer, "kill_attempts_total" integer, "ape_attempts_total" integer, "misc_errors_total" integer, "receive_errors_total" integer, "rec_eff" numeric, "errors_total" integer, "jump_serve_aces_total" integer, "float_aces_total" integer, "jump_serve_aces_per_set" numeric, "float_aces_per_set" numeric)
    LANGUAGE "sql" STABLE
    AS $$
WITH raw AS (
  SELECT
    pms.player_id,
    m.season_id,
    SUM(CASE WHEN pms.set_number = 5 THEN 0.5 ELSE 1 END)::numeric AS sets_played,
    COUNT(DISTINCT pms.match_id)::int         AS matches_played,
    SUM(pms.ape_kills)::int                   AS ape_kills_total,
    SUM(pms.ape_attempts)::int                AS ape_attempts_total,
    SUM(pms.delay_kills)::int                 AS delay_kills_total,
    SUM(pms.quick_kills)::int                 AS quick_kills_total,
    SUM(pms.wipes_tools)::int                 AS wipes_tools_total,
    SUM(pms.kill_attempts)::int               AS kill_attempts_total,
    SUM(pms.spiking_errors)::int              AS spiking_errors_total,
    SUM(pms.assists)::int                     AS assists_total,
    SUM(pms.setting_errors)::int              AS setting_errors_total,
    SUM(pms.kill_blocks)::int                 AS kill_blocks_total,
    SUM(pms.block_touches)::int               AS block_touches_total,
    SUM(pms.serve_receives)::int              AS serve_receives_total,
    SUM(pms.digs)::int                        AS digs_total,
    SUM(pms.block_follows)::int               AS block_follows_total,
    SUM(pms.dives)::int                       AS dives_total,
    SUM(pms.aces + pms.jump_serve_aces + pms.float_aces)::int AS aces_total,
    SUM(pms.jump_serve_aces)::int             AS jump_serve_aces_total,
    SUM(pms.float_aces)::int                  AS float_aces_total,
    SUM(pms.service_errors)::int              AS service_errors_total,
    SUM(pms.misc_errors)::int                 AS misc_errors_total,
    SUM(pms.receive_errors)::int              AS receive_errors_total
  FROM "public"."player_match_stats" pms
  JOIN "public"."matches" m ON m.id = pms.match_id
  WHERE m.status = 'completed'
    AND (p_season_id IS NULL OR m.season_id = p_season_id)
    AND (p_from IS NULL OR m.scheduled_at >= p_from)
    AND (p_to   IS NULL OR m.scheduled_at <  p_to)
    AND (p_position IS NULL OR pms.position = p_position OR pms.position IS NULL)
    AND (
      pms.ape_kills + pms.ape_attempts + pms.delay_kills + pms.quick_kills +
      pms.wipes_tools + pms.kill_attempts + pms.spiking_errors + pms.assists +
      pms.setting_errors + pms.kill_blocks + pms.block_touches + pms.serve_receives +
      pms.digs + pms.block_follows + pms.dives + pms.aces +
      pms.jump_serve_aces + pms.float_aces +
      pms.service_errors + pms.misc_errors + pms.receive_errors
    ) > 0
  GROUP BY pms.player_id, m.season_id
)
SELECT
  r.player_id,
  r.season_id,
  r.sets_played,
  r.matches_played,

  ROUND(r.ape_kills_total::numeric       / r.sets_played, 2) AS ape_kills_per_set,
  ROUND(r.ape_attempts_total::numeric    / r.sets_played, 2) AS ape_attempts_per_set,
  ROUND(r.delay_kills_total::numeric     / r.sets_played, 2) AS delay_kills_per_set,
  ROUND(r.quick_kills_total::numeric     / r.sets_played, 2) AS quick_kills_per_set,
  ROUND(r.wipes_tools_total::numeric     / r.sets_played, 2) AS wipes_tools_per_set,
  ROUND((r.ape_kills_total + r.delay_kills_total + r.quick_kills_total + r.wipes_tools_total)::numeric
        / r.sets_played, 2)                                   AS kills_per_set,
  ROUND(r.kill_attempts_total::numeric   / r.sets_played, 2) AS kill_attempts_per_set,
  ROUND(r.spiking_errors_total::numeric  / r.sets_played, 2) AS spiking_errors_per_set,

  ROUND(r.assists_total::numeric         / r.sets_played, 2) AS assists_per_set,
  ROUND(r.setting_errors_total::numeric  / r.sets_played, 2) AS setting_errors_per_set,

  ROUND(r.kill_blocks_total::numeric     / r.sets_played, 2) AS kill_blocks_per_set,
  ROUND(r.block_touches_total::numeric   / r.sets_played, 2) AS block_touches_per_set,
  ROUND((r.kill_blocks_total + r.block_touches_total)::numeric
        / r.sets_played, 2)                                   AS blocks_per_set,

  ROUND(r.serve_receives_total::numeric  / r.sets_played, 2) AS serve_receives_per_set,
  ROUND(r.digs_total::numeric            / r.sets_played, 2) AS digs_per_set,
  ROUND(r.block_follows_total::numeric   / r.sets_played, 2) AS block_follows_per_set,
  ROUND(r.dives_total::numeric           / r.sets_played, 2) AS dives_per_set,
  ROUND((r.serve_receives_total + r.digs_total + r.block_follows_total + r.dives_total)::numeric
        / r.sets_played, 2)                                   AS receives_per_set,

  ROUND(r.aces_total::numeric            / r.sets_played, 2) AS aces_per_set,
  ROUND(r.service_errors_total::numeric  / r.sets_played, 2) AS service_errors_per_set,
  (r.aces_total - r.service_errors_total)                    AS service_score,

  ROUND(r.misc_errors_total::numeric     / r.sets_played, 2) AS misc_errors_per_set,
  ROUND((r.spiking_errors_total + r.setting_errors_total + r.service_errors_total + r.misc_errors_total + r.receive_errors_total)::numeric
        / r.sets_played, 2)                                   AS errors_per_set,

  CASE
    WHEN r.kill_attempts_total = 0 THEN NULL
    ELSE ROUND(
      ((r.ape_kills_total + r.delay_kills_total + r.quick_kills_total + r.wipes_tools_total)
        - r.spiking_errors_total)::numeric
      / r.kill_attempts_total, 3)
  END AS hit_eff,
  CASE
    WHEN (r.kill_blocks_total + r.block_touches_total) = 0 THEN NULL
    ELSE ROUND(r.kill_blocks_total::numeric / (r.kill_blocks_total + r.block_touches_total), 3)
  END AS kb_pct,
  CASE
    WHEN (r.assists_total + r.setting_errors_total) = 0 THEN NULL
    ELSE ROUND(r.assists_total::numeric / (r.assists_total + r.setting_errors_total), 3)
  END AS set_eff,

  (r.ape_kills_total + r.delay_kills_total + r.quick_kills_total + r.wipes_tools_total
    + r.kill_blocks_total + r.aces_total)                     AS points_total,
  ROUND((r.ape_kills_total + r.delay_kills_total + r.quick_kills_total + r.wipes_tools_total
    + r.kill_blocks_total + r.aces_total)::numeric
        / r.sets_played, 2)                                   AS points_per_set,
  r.kill_blocks_total,
  r.block_touches_total,
  r.assists_total,
  r.setting_errors_total,
  r.serve_receives_total,
  r.digs_total,
  r.block_follows_total,
  r.dives_total,
  r.ape_kills_total,
  r.delay_kills_total,
  r.quick_kills_total,
  r.wipes_tools_total,
  r.spiking_errors_total,
  r.aces_total,
  r.service_errors_total,
  (r.ape_kills_total + r.delay_kills_total + r.quick_kills_total + r.wipes_tools_total) AS kills_total,
  (r.kill_blocks_total + r.block_touches_total)                                          AS blocks_total,
  (r.serve_receives_total + r.digs_total + r.block_follows_total + r.dives_total)         AS receives_total,

  r.kill_attempts_total,
  r.ape_attempts_total,
  r.misc_errors_total,

  r.receive_errors_total,
  CASE
    WHEN (r.serve_receives_total + r.digs_total + r.block_follows_total + r.dives_total + r.receive_errors_total) = 0 THEN NULL
    ELSE ROUND(
      ((r.serve_receives_total + r.digs_total + r.block_follows_total + r.dives_total) - r.receive_errors_total)::numeric
      / (r.serve_receives_total + r.digs_total + r.block_follows_total + r.dives_total + r.receive_errors_total), 3)
  END AS rec_eff,
  (r.spiking_errors_total + r.setting_errors_total + r.service_errors_total + r.misc_errors_total + r.receive_errors_total) AS errors_total,

  r.jump_serve_aces_total,
  r.float_aces_total,
  ROUND(r.jump_serve_aces_total::numeric / r.sets_played, 2) AS jump_serve_aces_per_set,
  ROUND(r.float_aces_total::numeric      / r.sets_played, 2) AS float_aces_per_set
FROM raw r;
$$;


ALTER FUNCTION "public"."get_player_season_stats_scoped"("p_season_id" "uuid", "p_from" timestamp with time zone, "p_to" timestamp with time zone, "p_position" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_player_stat_ranks"("p_roblox_user_id" "text", "p_season_number" integer DEFAULT NULL::integer) RETURNS TABLE("points_per_set" numeric, "kills_per_set" numeric, "assists_per_set" numeric, "blocks_per_set" numeric, "receives_per_set" numeric, "aces_per_set" numeric, "points_per_set_rank" numeric, "kills_per_set_rank" numeric, "hit_pct_rank" numeric, "assists_per_set_rank" numeric, "set_pct_rank" numeric, "blocks_per_set_rank" numeric, "kb_pct_rank" numeric, "receives_per_set_rank" numeric, "rec_pct_rank" numeric, "aces_per_set_rank" numeric)
    LANGUAGE "sql" STABLE
    AS $$
    WITH per_player AS (
        SELECT
            pms.player_id,
            pl.roblox_user_id,
            SUM(CASE WHEN pms.set_number = 5 THEN 0.5 ELSE 1 END)::numeric AS sets_played,
            SUM(pms.ape_kills)::int AS ape_kills, SUM(pms.delay_kills)::int AS delay_kills,
            SUM(pms.quick_kills)::int AS quick_kills, SUM(pms.wipes_tools)::int AS wipes_tools,
            SUM(pms.kill_attempts)::int AS kill_attempts, SUM(pms.spiking_errors)::int AS spiking_errors,
            SUM(pms.assists)::int AS assists, SUM(pms.setting_errors)::int AS setting_errors,
            SUM(pms.kill_blocks)::int AS kill_blocks, SUM(pms.block_touches)::int AS block_touches,
            SUM(pms.serve_receives + pms.digs + pms.block_follows + pms.dives)::int AS receives,
            SUM(pms.receive_errors)::int AS receive_errors,
            SUM(pms.jump_serve_aces + pms.aces)::int AS jump_serve_aces, SUM(pms.float_aces)::int AS float_aces
        FROM "public"."player_match_stats" pms
        JOIN "public"."players" pl ON pl.id = pms.player_id
        JOIN "public"."matches" m ON m.id = pms.match_id
        JOIN "public"."seasons" s ON s.id = m.season_id
        WHERE m.status = 'completed'
          AND (p_season_number IS NULL OR s.season_number = p_season_number)
          AND (
            pms.ape_kills + pms.ape_attempts + pms.delay_kills + pms.quick_kills +
            pms.wipes_tools + pms.kill_attempts + pms.spiking_errors + pms.assists +
            pms.setting_errors + pms.kill_blocks + pms.block_touches + pms.serve_receives +
            pms.digs + pms.block_follows + pms.dives + pms.aces +
            pms.jump_serve_aces + pms.float_aces + pms.service_errors + pms.misc_errors + pms.receive_errors
          ) > 0
        GROUP BY pms.player_id, pl.roblox_user_id
    ),
    qualified AS (
        SELECT
            *,
            (ape_kills + delay_kills + quick_kills + wipes_tools) AS kills,
            (kill_blocks + block_touches) AS blocks,
            (jump_serve_aces + float_aces) AS aces
        FROM per_player
    ),
    rated AS (
        SELECT *, (kills + kill_blocks + aces) AS points
        FROM qualified
    ),
    league AS (
        SELECT
            SUM(points)::numeric / SUM(sets_played) AS points_mu,
            SUM(kills)::numeric / SUM(sets_played) AS kills_mu,
            SUM(assists)::numeric / SUM(sets_played) AS assists_mu,
            SUM(blocks)::numeric / SUM(sets_played) AS blocks_mu,
            SUM(receives)::numeric / SUM(sets_played) AS receives_mu,
            SUM(aces)::numeric / SUM(sets_played) AS aces_mu
        FROM rated
    ),
    shrinkage AS (
        SELECT
            1.2::numeric AS points_k,
            1.2::numeric AS kills_k,
            0.1::numeric AS assists_k,
            0.6::numeric AS blocks_k,
            0.9::numeric AS receives_k,
            3.6::numeric AS aces_k
    ),
    gated AS (
        SELECT
            r.player_id, r.roblox_user_id,
            ROUND((r.points + sh.points_k * lg.points_mu) / (r.sets_played + sh.points_k), 3) AS points_per_set,
            ROUND((r.kills + sh.kills_k * lg.kills_mu) / (r.sets_played + sh.kills_k), 3) AS kills_per_set,
            CASE WHEN r.sets_played >= 4 AND r.kill_attempts >= 10
                THEN ROUND((r.kills - r.spiking_errors)::numeric / r.kill_attempts, 3) END AS hit_pct,
            ROUND((r.assists + sh.assists_k * lg.assists_mu) / (r.sets_played + sh.assists_k), 3) AS assists_per_set,
            CASE WHEN r.sets_played >= 4 AND (r.assists + r.setting_errors) >= 10
                THEN ROUND(r.assists::numeric / (r.assists + r.setting_errors), 3) END AS set_pct,
            ROUND((r.blocks + sh.blocks_k * lg.blocks_mu) / (r.sets_played + sh.blocks_k), 3) AS blocks_per_set,
            CASE WHEN r.sets_played >= 4 AND r.blocks >= 5
                THEN ROUND(r.kill_blocks::numeric / r.blocks, 3) END AS kb_pct,
            ROUND((r.receives + sh.receives_k * lg.receives_mu) / (r.sets_played + sh.receives_k), 3) AS receives_per_set,
            CASE WHEN r.sets_played >= 4 AND (r.receives + r.receive_errors) >= 5
                THEN ROUND((r.receives - r.receive_errors)::numeric / (r.receives + r.receive_errors), 3) END AS rec_pct,
            ROUND((r.aces + sh.aces_k * lg.aces_mu) / (r.sets_played + sh.aces_k), 3) AS aces_per_set
        FROM rated r
        CROSS JOIN league lg
        CROSS JOIN shrinkage sh
    ),
    ranked AS (
        SELECT
            player_id, roblox_user_id,
            points_per_set, kills_per_set, assists_per_set, blocks_per_set, receives_per_set, aces_per_set,
            PERCENT_RANK() OVER (ORDER BY points_per_set) AS points_per_set_rank,
            PERCENT_RANK() OVER (ORDER BY kills_per_set) AS kills_per_set_rank,
            CASE WHEN hit_pct IS NULL THEN NULL ELSE
                PERCENT_RANK() OVER (PARTITION BY (hit_pct IS NOT NULL) ORDER BY hit_pct) END AS hit_pct_rank,
            PERCENT_RANK() OVER (ORDER BY assists_per_set) AS assists_per_set_rank,
            CASE WHEN set_pct IS NULL THEN NULL ELSE
                PERCENT_RANK() OVER (PARTITION BY (set_pct IS NOT NULL) ORDER BY set_pct) END AS set_pct_rank,
            PERCENT_RANK() OVER (ORDER BY blocks_per_set) AS blocks_per_set_rank,
            CASE WHEN kb_pct IS NULL THEN NULL ELSE
                PERCENT_RANK() OVER (PARTITION BY (kb_pct IS NOT NULL) ORDER BY kb_pct) END AS kb_pct_rank,
            PERCENT_RANK() OVER (ORDER BY receives_per_set) AS receives_per_set_rank,
            CASE WHEN rec_pct IS NULL THEN NULL ELSE
                PERCENT_RANK() OVER (PARTITION BY (rec_pct IS NOT NULL) ORDER BY rec_pct) END AS rec_pct_rank,
            PERCENT_RANK() OVER (ORDER BY aces_per_set) AS aces_per_set_rank
        FROM gated
    )
    SELECT
        r.points_per_set, r.kills_per_set, r.assists_per_set, r.blocks_per_set, r.receives_per_set, r.aces_per_set,
        r.points_per_set_rank, r.kills_per_set_rank, r.hit_pct_rank, r.assists_per_set_rank, r.set_pct_rank,
        r.blocks_per_set_rank, r.kb_pct_rank, r.receives_per_set_rank, r.rec_pct_rank, r.aces_per_set_rank
    FROM (SELECT p_roblox_user_id::bigint AS roblox_user_id) target
    LEFT JOIN ranked r ON r.roblox_user_id = target.roblox_user_id
$$;


ALTER FUNCTION "public"."get_player_stat_ranks"("p_roblox_user_id" "text", "p_season_number" integer) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_raw_stat_summary"("p_season_number" integer DEFAULT NULL::integer) RETURNS TABLE("sets_played_min" numeric, "sets_played_max" numeric, "sets_played_mean" numeric, "ape_kills_min" integer, "ape_kills_max" integer, "ape_kills_mean" numeric, "ape_attempts_min" integer, "ape_attempts_max" integer, "ape_attempts_mean" numeric, "delay_kills_min" integer, "delay_kills_max" integer, "delay_kills_mean" numeric, "quick_kills_min" integer, "quick_kills_max" integer, "quick_kills_mean" numeric, "wipes_tools_min" integer, "wipes_tools_max" integer, "wipes_tools_mean" numeric, "kill_attempts_min" integer, "kill_attempts_max" integer, "kill_attempts_mean" numeric, "spiking_errors_min" integer, "spiking_errors_max" integer, "spiking_errors_mean" numeric, "assists_min" integer, "assists_max" integer, "assists_mean" numeric, "setting_errors_min" integer, "setting_errors_max" integer, "setting_errors_mean" numeric, "kill_blocks_min" integer, "kill_blocks_max" integer, "kill_blocks_mean" numeric, "block_touches_min" integer, "block_touches_max" integer, "block_touches_mean" numeric, "receives_min" integer, "receives_max" integer, "receives_mean" numeric, "digs_min" integer, "digs_max" integer, "digs_mean" numeric, "block_follows_min" integer, "block_follows_max" integer, "block_follows_mean" numeric, "dives_min" integer, "dives_max" integer, "dives_mean" numeric, "receive_errors_min" integer, "receive_errors_max" integer, "receive_errors_mean" numeric, "jump_serve_aces_min" integer, "jump_serve_aces_max" integer, "jump_serve_aces_mean" numeric, "float_aces_min" integer, "float_aces_max" integer, "float_aces_mean" numeric, "service_errors_min" integer, "service_errors_max" integer, "service_errors_mean" numeric, "points_per_set_min" numeric, "points_per_set_max" numeric, "points_per_set_mean" numeric, "kills_per_set_min" numeric, "kills_per_set_max" numeric, "kills_per_set_mean" numeric, "hit_pct_min" numeric, "hit_pct_max" numeric, "hit_pct_mean" numeric, "assists_per_set_min" numeric, "assists_per_set_max" numeric, "assists_per_set_mean" numeric, "set_pct_min" numeric, "set_pct_max" numeric, "set_pct_mean" numeric, "blocks_per_set_min" numeric, "blocks_per_set_max" numeric, "blocks_per_set_mean" numeric, "kb_pct_min" numeric, "kb_pct_max" numeric, "kb_pct_mean" numeric, "receives_per_set_min" numeric, "receives_per_set_max" numeric, "receives_per_set_mean" numeric, "rec_pct_min" numeric, "rec_pct_max" numeric, "rec_pct_mean" numeric, "aces_per_set_min" numeric, "aces_per_set_max" numeric, "aces_per_set_mean" numeric)
    LANGUAGE "sql" STABLE
    AS $$
    WITH per_player AS (
        SELECT
            pms.player_id,
            SUM(CASE WHEN pms.set_number = 5 THEN 0.5 ELSE 1 END)::numeric AS sets_played,
            SUM(pms.ape_kills)::int AS ape_kills, SUM(pms.ape_attempts)::int AS ape_attempts,
            SUM(pms.delay_kills)::int AS delay_kills, SUM(pms.quick_kills)::int AS quick_kills,
            SUM(pms.wipes_tools)::int AS wipes_tools, SUM(pms.kill_attempts)::int AS kill_attempts,
            SUM(pms.spiking_errors)::int AS spiking_errors,
            SUM(pms.assists)::int AS assists, SUM(pms.setting_errors)::int AS setting_errors,
            SUM(pms.kill_blocks)::int AS kill_blocks, SUM(pms.block_touches)::int AS block_touches,
            SUM(pms.serve_receives + pms.digs + pms.block_follows + pms.dives)::int AS receives,
            SUM(pms.digs)::int AS digs, SUM(pms.block_follows)::int AS block_follows,
            SUM(pms.dives)::int AS dives, SUM(pms.receive_errors)::int AS receive_errors,
            SUM(pms.jump_serve_aces + pms.aces)::int AS jump_serve_aces, SUM(pms.float_aces)::int AS float_aces,
            SUM(pms.service_errors)::int AS service_errors
        FROM "public"."player_match_stats" pms
        JOIN "public"."matches" m ON m.id = pms.match_id
        JOIN "public"."seasons" s ON s.id = m.season_id
        WHERE m.status = 'completed'
          AND (p_season_number IS NULL OR s.season_number = p_season_number)
          AND (
            pms.ape_kills + pms.ape_attempts + pms.delay_kills + pms.quick_kills +
            pms.wipes_tools + pms.kill_attempts + pms.spiking_errors + pms.assists +
            pms.setting_errors + pms.kill_blocks + pms.block_touches + pms.serve_receives +
            pms.digs + pms.block_follows + pms.dives + pms.aces +
            pms.jump_serve_aces + pms.float_aces + pms.service_errors + pms.misc_errors + pms.receive_errors
          ) > 0
        GROUP BY pms.player_id
    ),
    qualified AS (
        SELECT
            *,
            (ape_kills + delay_kills + quick_kills + wipes_tools) AS kills,
            (kill_blocks + block_touches) AS blocks,
            (jump_serve_aces + float_aces) AS aces
        FROM per_player
    ),
    rated AS (
        SELECT *, (kills + kill_blocks + aces) AS points
        FROM qualified
    ),
    league AS (
        SELECT
            SUM(points)::numeric / SUM(sets_played) AS points_mu,
            SUM(kills)::numeric / SUM(sets_played) AS kills_mu,
            SUM(assists)::numeric / SUM(sets_played) AS assists_mu,
            SUM(blocks)::numeric / SUM(sets_played) AS blocks_mu,
            SUM(receives)::numeric / SUM(sets_played) AS receives_mu,
            SUM(aces)::numeric / SUM(sets_played) AS aces_mu
        FROM rated
    ),
    shrinkage AS (
        SELECT
            1.2::numeric AS points_k,
            1.2::numeric AS kills_k,
            0.1::numeric AS assists_k,
            0.6::numeric AS blocks_k,
            0.9::numeric AS receives_k,
            3.6::numeric AS aces_k
    ),
    gated AS (
        SELECT
            r.*,
            ROUND((r.points + sh.points_k * lg.points_mu) / (r.sets_played + sh.points_k), 3) AS points_per_set,
            ROUND((r.kills + sh.kills_k * lg.kills_mu) / (r.sets_played + sh.kills_k), 3) AS kills_per_set,
            CASE WHEN r.sets_played >= 4 AND r.kill_attempts >= 10
                THEN ROUND((r.kills - r.spiking_errors)::numeric / r.kill_attempts, 3) END AS hit_pct,
            ROUND((r.assists + sh.assists_k * lg.assists_mu) / (r.sets_played + sh.assists_k), 3) AS assists_per_set,
            CASE WHEN r.sets_played >= 4 AND (r.assists + r.setting_errors) >= 10
                THEN ROUND(r.assists::numeric / (r.assists + r.setting_errors), 3) END AS set_pct,
            ROUND((r.blocks + sh.blocks_k * lg.blocks_mu) / (r.sets_played + sh.blocks_k), 3) AS blocks_per_set,
            CASE WHEN r.sets_played >= 4 AND r.blocks >= 5
                THEN ROUND(r.kill_blocks::numeric / r.blocks, 3) END AS kb_pct,
            ROUND((r.receives + sh.receives_k * lg.receives_mu) / (r.sets_played + sh.receives_k), 3) AS receives_per_set,
            CASE WHEN r.sets_played >= 4 AND (r.receives + r.receive_errors) >= 5
                THEN ROUND((r.receives - r.receive_errors)::numeric / (r.receives + r.receive_errors), 3) END AS rec_pct,
            ROUND((r.aces + sh.aces_k * lg.aces_mu) / (r.sets_played + sh.aces_k), 3) AS aces_per_set
        FROM rated r
        CROSS JOIN league lg
        CROSS JOIN shrinkage sh
    )
    SELECT
        MIN(sets_played), MAX(sets_played), ROUND(AVG(sets_played), 2),
        MIN(ape_kills), MAX(ape_kills), ROUND(AVG(ape_kills), 2),
        MIN(ape_attempts), MAX(ape_attempts), ROUND(AVG(ape_attempts), 2),
        MIN(delay_kills), MAX(delay_kills), ROUND(AVG(delay_kills), 2),
        MIN(quick_kills), MAX(quick_kills), ROUND(AVG(quick_kills), 2),
        MIN(wipes_tools), MAX(wipes_tools), ROUND(AVG(wipes_tools), 2),
        MIN(kill_attempts), MAX(kill_attempts), ROUND(AVG(kill_attempts), 2),
        MIN(spiking_errors), MAX(spiking_errors), ROUND(AVG(spiking_errors), 2),
        MIN(assists), MAX(assists), ROUND(AVG(assists), 2),
        MIN(setting_errors), MAX(setting_errors), ROUND(AVG(setting_errors), 2),
        MIN(kill_blocks), MAX(kill_blocks), ROUND(AVG(kill_blocks), 2),
        MIN(block_touches), MAX(block_touches), ROUND(AVG(block_touches), 2),
        MIN(receives), MAX(receives), ROUND(AVG(receives), 2),
        MIN(digs), MAX(digs), ROUND(AVG(digs), 2),
        MIN(block_follows), MAX(block_follows), ROUND(AVG(block_follows), 2),
        MIN(dives), MAX(dives), ROUND(AVG(dives), 2),
        MIN(receive_errors), MAX(receive_errors), ROUND(AVG(receive_errors), 2),
        MIN(jump_serve_aces), MAX(jump_serve_aces), ROUND(AVG(jump_serve_aces), 2),
        MIN(float_aces), MAX(float_aces), ROUND(AVG(float_aces), 2),
        MIN(service_errors), MAX(service_errors), ROUND(AVG(service_errors), 2),
        MIN(points_per_set), MAX(points_per_set), ROUND(AVG(points_per_set), 3),
        MIN(kills_per_set), MAX(kills_per_set), ROUND(AVG(kills_per_set), 3),
        MIN(hit_pct), MAX(hit_pct), ROUND(AVG(hit_pct), 3),
        MIN(assists_per_set), MAX(assists_per_set), ROUND(AVG(assists_per_set), 3),
        MIN(set_pct), MAX(set_pct), ROUND(AVG(set_pct), 3),
        MIN(blocks_per_set), MAX(blocks_per_set), ROUND(AVG(blocks_per_set), 3),
        MIN(kb_pct), MAX(kb_pct), ROUND(AVG(kb_pct), 3),
        MIN(receives_per_set), MAX(receives_per_set), ROUND(AVG(receives_per_set), 3),
        MIN(rec_pct), MAX(rec_pct), ROUND(AVG(rec_pct), 3),
        MIN(aces_per_set), MAX(aces_per_set), ROUND(AVG(aces_per_set), 3)
    FROM gated;
$$;


ALTER FUNCTION "public"."get_raw_stat_summary"("p_season_number" integer) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_user_role"("check_user_id" "uuid") RETURNS "text"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
declare
  user_role text;
begin
  select role into user_role
  from user_roles
  where user_id = check_user_id;

  return user_role;
end;
$$;


ALTER FUNCTION "public"."get_user_role"("check_user_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."has_role"("check_user_id" "uuid") RETURNS boolean
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM user_roles WHERE user_id = check_user_id
  );
END;
$$;


ALTER FUNCTION "public"."has_role"("check_user_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."readvance_playoff_match"("p_match_id" "uuid") RETURNS "public"."matches"
    LANGUAGE "plpgsql"
    AS $$
DECLARE
  v_match matches%ROWTYPE;
BEGIN
  SELECT * INTO v_match FROM matches WHERE id = p_match_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'match not found';
  END IF;

  IF v_match.match_type <> 'playoffs'
     OR v_match.status <> 'completed'
     OR v_match.home_team_id IS NULL
     OR v_match.away_team_id IS NULL THEN
    RAISE EXCEPTION 'match is not a completed playoff match with both teams';
  END IF;

  PERFORM advance_playoff_winner(p_match_id);

  SELECT * INTO v_match FROM matches WHERE id = p_match_id;
  RETURN v_match;
END;
$$;


ALTER FUNCTION "public"."readvance_playoff_match"("p_match_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."reapply_match_result"("p_match_id" "uuid", "p_sets" "jsonb", "p_home_sets_won" integer, "p_away_sets_won" integer, "p_home_lvr" numeric DEFAULT NULL::numeric, "p_away_lvr" numeric DEFAULT NULL::numeric, "p_home_points" numeric DEFAULT NULL::numeric, "p_away_points" numeric DEFAULT NULL::numeric, "p_home_bonus" numeric DEFAULT NULL::numeric, "p_away_bonus" numeric DEFAULT NULL::numeric, "p_point_diff" numeric DEFAULT NULL::numeric, "p_mvp_player_id" "uuid" DEFAULT NULL::"uuid", "p_loser_mvp_player_id" "uuid" DEFAULT NULL::"uuid", "p_is_forfeit" boolean DEFAULT false) RETURNS "public"."matches"
    LANGUAGE "plpgsql"
    AS $$
DECLARE
  v_start_bracket playoff_brackets%ROWTYPE;
  v_match         matches%ROWTYPE;
  v_season_id     uuid;
  v_old_home_won  boolean;
  v_new_home_won  boolean;
  r               record;
BEGIN
  SELECT (home_sets_won > away_sets_won) INTO v_old_home_won
  FROM matches WHERE id = p_match_id;

  DELETE FROM match_sets WHERE match_id = p_match_id;

  INSERT INTO match_sets (match_id, set_number, home_score, away_score)
  SELECT
    p_match_id,
    (s->>'set_number')::int,
    (s->>'home_score')::int,
    (s->>'away_score')::int
  FROM jsonb_array_elements(p_sets) AS s;

  UPDATE matches SET
    home_sets_won        = p_home_sets_won,
    away_sets_won        = p_away_sets_won,
    home_team_lvr        = p_home_lvr,
    away_team_lvr        = p_away_lvr,
    home_team_points     = p_home_points,
    away_team_points     = p_away_points,
    home_team_bonus      = p_home_bonus,
    away_team_bonus      = p_away_bonus,
    point_diff           = p_point_diff,
    match_mvp_player_id  = p_mvp_player_id,
    loser_mvp_player_id  = p_loser_mvp_player_id,
    is_forfeit           = p_is_forfeit
  WHERE id = p_match_id;

  v_new_home_won := (p_home_sets_won > p_away_sets_won);

  SELECT * INTO v_start_bracket FROM playoff_brackets WHERE match_id = p_match_id;

  IF FOUND THEN
    IF v_old_home_won IS DISTINCT FROM v_new_home_won THEN

      SELECT season_id INTO v_season_id FROM matches WHERE id = p_match_id;

      CREATE TEMP TABLE _downstream ON COMMIT DROP AS
      WITH RECURSIVE downstream(bracket_id, match_id, next_bracket_id, loser_next_bracket_id) AS (
        SELECT pb.id, pb.match_id, pb.next_bracket_id, pb.loser_next_bracket_id
        FROM playoff_brackets pb
        WHERE pb.id = v_start_bracket.next_bracket_id
           OR pb.id = v_start_bracket.loser_next_bracket_id

        UNION ALL

        SELECT pb.id, pb.match_id, pb.next_bracket_id, pb.loser_next_bracket_id
        FROM playoff_brackets pb
        JOIN downstream d ON pb.id = d.next_bracket_id OR pb.id = d.loser_next_bracket_id
      )
      SELECT bracket_id, match_id FROM downstream;

      DELETE FROM match_sets      WHERE match_id IN (SELECT match_id FROM _downstream);
      DELETE FROM match_officials WHERE match_id IN (SELECT match_id FROM _downstream);

      UPDATE matches SET
        status              = 'pending',
        home_team_id        = NULL,
        away_team_id        = NULL,
        home_sets_won       = NULL,
        away_sets_won       = NULL,
        home_team_lvr       = NULL,
        away_team_lvr       = NULL,
        home_team_points    = NULL,
        away_team_points    = NULL,
        home_team_bonus     = NULL,
        away_team_bonus     = NULL,
        point_diff          = NULL,
        match_mvp_player_id = NULL,
        loser_mvp_player_id = NULL,
        is_forfeit          = false,
        scheduled_at        = NULL
      WHERE id IN (SELECT match_id FROM _downstream);

      UPDATE playoff_brackets SET
        seed_home = NULL,
        seed_away = NULL
      WHERE id IN (SELECT bracket_id FROM _downstream);

      DROP TABLE _downstream;

      FOR r IN
        SELECT pb.match_id
        FROM playoff_brackets pb
        JOIN matches m ON m.id = pb.match_id
        WHERE pb.season_id = v_season_id
          AND m.status = 'completed'
          AND m.home_team_id IS NOT NULL
          AND m.away_team_id IS NOT NULL
        ORDER BY pb.display_order
      LOOP
        PERFORM advance_playoff_winner(r.match_id);
      END LOOP;
    ELSE

      PERFORM advance_playoff_winner(p_match_id);
    END IF;
  END IF;

  SELECT * INTO v_match FROM matches WHERE id = p_match_id;
  RETURN v_match;
END;
$$;


ALTER FUNCTION "public"."reapply_match_result"("p_match_id" "uuid", "p_sets" "jsonb", "p_home_sets_won" integer, "p_away_sets_won" integer, "p_home_lvr" numeric, "p_away_lvr" numeric, "p_home_points" numeric, "p_away_points" numeric, "p_home_bonus" numeric, "p_away_bonus" numeric, "p_point_diff" numeric, "p_mvp_player_id" "uuid", "p_loser_mvp_player_id" "uuid", "p_is_forfeit" boolean) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."replace_match_player_stats"("p_match_id" "uuid", "p_rows" "jsonb") RETURNS "void"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
  DELETE FROM public.player_match_stats WHERE match_id = p_match_id;

  IF p_rows IS NOT NULL AND jsonb_array_length(p_rows) > 0 THEN
    INSERT INTO public.player_match_stats (
      match_id, player_id, team_id, set_number,
      position,
      ape_kills, ape_attempts, delay_kills, quick_kills, wipes_tools,
      kill_attempts, spiking_errors,
      assists, setting_errors,
      kill_blocks, block_touches,
      digs, block_follows, dives,
      aces, jump_serve_aces, float_aces, service_errors,
      misc_errors, receive_errors
    )
    SELECT
      (r->>'match_id')::uuid,
      (r->>'player_id')::uuid,
      (r->>'team_id')::uuid,
      (r->>'set_number')::int,
      NULLIF(r->>'position', ''),
      COALESCE((r->>'ape_kills')::int, 0), COALESCE((r->>'ape_attempts')::int, 0),
      COALESCE((r->>'delay_kills')::int, 0), COALESCE((r->>'quick_kills')::int, 0), COALESCE((r->>'wipes_tools')::int, 0),
      COALESCE((r->>'kill_attempts')::int, 0), COALESCE((r->>'spiking_errors')::int, 0),
      COALESCE((r->>'assists')::int, 0), COALESCE((r->>'setting_errors')::int, 0),
      COALESCE((r->>'kill_blocks')::int, 0), COALESCE((r->>'block_touches')::int, 0),
      COALESCE((r->>'digs')::int, 0), COALESCE((r->>'block_follows')::int, 0), COALESCE((r->>'dives')::int, 0),
      COALESCE((r->>'aces')::int, 0), COALESCE((r->>'jump_serve_aces')::int, 0), COALESCE((r->>'float_aces')::int, 0), COALESCE((r->>'service_errors')::int, 0),
      COALESCE((r->>'misc_errors')::int, 0), COALESCE((r->>'receive_errors')::int, 0)
    FROM jsonb_array_elements(p_rows) AS r;
  END IF;
END;
$$;


ALTER FUNCTION "public"."replace_match_player_stats"("p_match_id" "uuid", "p_rows" "jsonb") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."search_players_with_similarity"("search_term" "text") RETURNS TABLE("id" "uuid", "roblox_user_id" "text", "username" "text", "display_name" "text", "avatar_url" "text", "similarity_score" real)
    LANGUAGE "plpgsql"
    AS $$
BEGIN
    SET pg_trgm.similarity_threshold = 0.3;

    RETURN QUERY
    SELECT
        p.id,
        p.roblox_user_id::TEXT,
        p.username,
        p.display_name,
        p.avatar_url,
        GREATEST(
            COALESCE(similarity(LOWER(p.username), search_term), 0),
            COALESCE(similarity(LOWER(p.display_name), search_term), 0)
        ) AS similarity_score
    FROM players p
    WHERE
        LOWER(p.username) % search_term
        OR LOWER(p.display_name) % search_term
        OR LOWER(p.username) ILIKE '%' || search_term || '%'
        OR LOWER(p.display_name) ILIKE '%' || search_term || '%'
    ORDER BY similarity_score DESC
    LIMIT 20;
END;
$$;


ALTER FUNCTION "public"."search_players_with_similarity"("search_term" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."update_officials_updated_at"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."update_officials_updated_at"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."void_match"("p_match_id" "uuid") RETURNS "public"."matches"
    LANGUAGE "plpgsql"
    AS $$
DECLARE
  v_start_bracket playoff_brackets%ROWTYPE;
  v_match         matches%ROWTYPE;
  v_season_id     uuid;
  r               record;
BEGIN
  DELETE FROM match_sets      WHERE match_id = p_match_id;
  DELETE FROM match_officials WHERE match_id = p_match_id;

  SELECT * INTO v_start_bracket FROM playoff_brackets WHERE match_id = p_match_id;

  IF FOUND THEN
    CREATE TEMP TABLE _downstream ON COMMIT DROP AS
    WITH RECURSIVE downstream(bracket_id, match_id, next_bracket_id, loser_next_bracket_id) AS (
      SELECT pb.id, pb.match_id, pb.next_bracket_id, pb.loser_next_bracket_id
      FROM playoff_brackets pb
      WHERE pb.id = v_start_bracket.next_bracket_id
         OR pb.id = v_start_bracket.loser_next_bracket_id

      UNION ALL

      SELECT pb.id, pb.match_id, pb.next_bracket_id, pb.loser_next_bracket_id
      FROM playoff_brackets pb
      JOIN downstream d ON pb.id = d.next_bracket_id OR pb.id = d.loser_next_bracket_id
    )
    SELECT bracket_id, match_id FROM downstream;

    DELETE FROM match_sets      WHERE match_id IN (SELECT match_id FROM _downstream);
    DELETE FROM match_officials WHERE match_id IN (SELECT match_id FROM _downstream);

    UPDATE matches SET
      status              = 'pending',
      home_team_id        = NULL,
      away_team_id        = NULL,
      home_sets_won       = NULL,
      away_sets_won       = NULL,
      home_team_lvr       = NULL,
      away_team_lvr       = NULL,
      home_team_points    = NULL,
      away_team_points    = NULL,
      home_team_bonus     = NULL,
      away_team_bonus     = NULL,
      point_diff          = NULL,
      match_mvp_player_id = NULL,
      loser_mvp_player_id = NULL,
      is_forfeit          = false,
      scheduled_at        = NULL
    WHERE id IN (SELECT match_id FROM _downstream);

    UPDATE playoff_brackets SET
      seed_home = NULL,
      seed_away = NULL
    WHERE id IN (SELECT bracket_id FROM _downstream);

    DROP TABLE _downstream;
  END IF;

  UPDATE matches SET
    status              = 'pending',
    home_sets_won       = NULL,
    away_sets_won       = NULL,
    home_team_lvr       = NULL,
    away_team_lvr       = NULL,
    home_team_points    = NULL,
    away_team_points    = NULL,
    home_team_bonus     = NULL,
    away_team_bonus     = NULL,
    point_diff          = NULL,
    match_mvp_player_id = NULL,
    loser_mvp_player_id = NULL,
    is_forfeit          = false,
    scheduled_at        = NULL
  WHERE id = p_match_id;

  IF v_start_bracket.id IS NOT NULL THEN
    SELECT season_id INTO v_season_id FROM matches WHERE id = p_match_id;

    FOR r IN
      SELECT pb.match_id
      FROM playoff_brackets pb
      JOIN matches m ON m.id = pb.match_id
      WHERE pb.season_id = v_season_id
        AND m.status = 'completed'
        AND m.home_team_id IS NOT NULL
        AND m.away_team_id IS NOT NULL
      ORDER BY pb.display_order
    LOOP
      PERFORM advance_playoff_winner(r.match_id);
    END LOOP;
  END IF;

  SELECT * INTO v_match FROM matches WHERE id = p_match_id;
  RETURN v_match;
END;
$$;


ALTER FUNCTION "public"."void_match"("p_match_id" "uuid") OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."article_media" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "article_id" "uuid" NOT NULL,
    "media_post_id" "uuid" NOT NULL,
    "handle" "text" NOT NULL,
    "placement" "text" DEFAULT 'center'::"text" NOT NULL,
    "sort_order" integer DEFAULT 0 NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "article_media_placement_check" CHECK (("placement" = ANY (ARRAY['left'::"text", 'center'::"text", 'right'::"text"])))
);


ALTER TABLE "public"."article_media" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."articles" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "slug" "text" NOT NULL,
    "title" "text" NOT NULL,
    "body" "text" NOT NULL,
    "author_id" "uuid",
    "match_id" "uuid",
    "season_id" "uuid",
    "published_at" timestamp with time zone,
    "created_by" "uuid" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."articles" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."cache_versions" (
    "tag" "text" NOT NULL,
    "version" bigint DEFAULT 0 NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."cache_versions" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."match_officials" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "match_id" "uuid" NOT NULL,
    "player_id" "uuid" NOT NULL,
    "official_type" "text" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "match_officials_official_type_check" CHECK (("official_type" = ANY (ARRAY['referee'::"text", 'media'::"text"])))
);


ALTER TABLE "public"."match_officials" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."match_sets" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "match_id" "uuid" NOT NULL,
    "set_number" integer NOT NULL,
    "home_score" integer DEFAULT 0 NOT NULL,
    "away_score" integer DEFAULT 0 NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."match_sets" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."match_sheet_config" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "match_id" "uuid" NOT NULL,
    "sheet_id" "text" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."match_sheet_config" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."media_posts" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "type" "text" NOT NULL,
    "title" "text" NOT NULL,
    "description" "text",
    "image_url" "text",
    "video_url" "text",
    "author_id" "uuid",
    "match_id" "uuid",
    "team_id" "uuid",
    "season_id" "uuid",
    "published_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "created_by" "uuid" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone,
    "is_pinned" boolean DEFAULT false NOT NULL,
    "pinned_at" timestamp with time zone,
    "player_id" "uuid",
    "article_id" "uuid",
    CONSTRAINT "media_posts_type_check" CHECK (("type" = ANY (ARRAY['gfx'::"text", 'video'::"text", 'news'::"text", 'recap'::"text", 'clip'::"text", 'totw'::"text", 'potw'::"text", 'article'::"text"])))
);


ALTER TABLE "public"."media_posts" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."pending_users" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "email" "text" NOT NULL,
    "requested_at" timestamp with time zone,
    "notes" "text",
    "role" "text" NOT NULL,
    "invited_by" "uuid",
    "accepted" boolean DEFAULT false,
    "expires_at" timestamp with time zone DEFAULT ("now"() + '7 days'::interval),
    CONSTRAINT "pending_users_role_check" CHECK (("role" = ANY (ARRAY['user'::"text", 'admin'::"text", 'super_admin'::"text", 'stat_tracker'::"text", 'staff'::"text", 'spec_manager'::"text"])))
);


ALTER TABLE "public"."pending_users" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."player_match_stats" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "match_id" "uuid" NOT NULL,
    "player_id" "uuid" NOT NULL,
    "team_id" "uuid" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "set_number" integer NOT NULL,
    "ape_kills" integer NOT NULL,
    "ape_attempts" integer NOT NULL,
    "delay_kills" integer NOT NULL,
    "quick_kills" integer NOT NULL,
    "wipes_tools" integer NOT NULL,
    "kill_attempts" integer NOT NULL,
    "spiking_errors" integer NOT NULL,
    "assists" integer NOT NULL,
    "setting_errors" integer NOT NULL,
    "kill_blocks" integer NOT NULL,
    "block_touches" integer NOT NULL,
    "serve_receives" integer DEFAULT 0 NOT NULL,
    "digs" integer NOT NULL,
    "block_follows" integer NOT NULL,
    "dives" integer NOT NULL,
    "aces" integer NOT NULL,
    "service_errors" integer NOT NULL,
    "misc_errors" integer NOT NULL,
    "receive_errors" integer DEFAULT 0 NOT NULL,
    "position" "text",
    "jump_serve_aces" integer DEFAULT 0 NOT NULL,
    "float_aces" integer DEFAULT 0 NOT NULL,
    CONSTRAINT "player_match_stats_aces_check" CHECK (("aces" >= 0)),
    CONSTRAINT "player_match_stats_ape_attempts_check" CHECK (("ape_attempts" >= 0)),
    CONSTRAINT "player_match_stats_ape_kills_check" CHECK (("ape_kills" >= 0)),
    CONSTRAINT "player_match_stats_assists_check" CHECK (("assists" >= 0)),
    CONSTRAINT "player_match_stats_block_follows_check" CHECK (("block_follows" >= 0)),
    CONSTRAINT "player_match_stats_block_touches_check" CHECK (("block_touches" >= 0)),
    CONSTRAINT "player_match_stats_delay_kills_check" CHECK (("delay_kills" >= 0)),
    CONSTRAINT "player_match_stats_digs_check" CHECK (("digs" >= 0)),
    CONSTRAINT "player_match_stats_dives_check" CHECK (("dives" >= 0)),
    CONSTRAINT "player_match_stats_kill_attempts_check" CHECK (("kill_attempts" >= 0)),
    CONSTRAINT "player_match_stats_kill_blocks_check" CHECK (("kill_blocks" >= 0)),
    CONSTRAINT "player_match_stats_misc_errors_check" CHECK (("misc_errors" >= 0)),
    CONSTRAINT "player_match_stats_quick_kills_check" CHECK (("quick_kills" >= 0)),
    CONSTRAINT "player_match_stats_serve_receives_check" CHECK (("serve_receives" >= 0)),
    CONSTRAINT "player_match_stats_service_errors_check" CHECK (("service_errors" >= 0)),
    CONSTRAINT "player_match_stats_set_number_check" CHECK ((("set_number" >= 1) AND ("set_number" <= 5))),
    CONSTRAINT "player_match_stats_setting_errors_check" CHECK (("setting_errors" >= 0)),
    CONSTRAINT "player_match_stats_spiking_errors_check" CHECK (("spiking_errors" >= 0)),
    CONSTRAINT "player_match_stats_wipes_tools_check" CHECK (("wipes_tools" >= 0))
);


ALTER TABLE "public"."player_match_stats" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."player_team_seasons" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "player_id" "uuid" NOT NULL,
    "team_id" "uuid" NOT NULL,
    "season_id" "uuid" NOT NULL,
    "joined_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "left_at" timestamp with time zone,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "role" "text" DEFAULT 'player'::"text",
    "position" "text",
    "height" "text",
    CONSTRAINT "player_team_seasons_position_check" CHECK ((("position" IS NULL) OR ("position" = ANY (ARRAY['OUT'::"text", 'OPP'::"text", 'MID'::"text", 'SET'::"text", 'LIB'::"text"])))),
    CONSTRAINT "player_team_seasons_role_check" CHECK (("role" = ANY (ARRAY['captain'::"text", 'vice_captain'::"text", 'court_captain'::"text", 'player'::"text"])))
);


ALTER TABLE "public"."player_team_seasons" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."players" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "roblox_user_id" bigint NOT NULL,
    "username" "text" NOT NULL,
    "avatar_url" "text",
    "display_name" "text",
    "jersey_number" integer,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "last_synced_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."players" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."playoff_brackets" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "season_id" "uuid" NOT NULL,
    "round" "text" NOT NULL,
    "match_id" "uuid" NOT NULL,
    "seed_home" integer,
    "seed_away" integer,
    "next_bracket_id" "uuid",
    "winner_position" "text",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "loser_next_bracket_id" "uuid",
    "loser_position" "text",
    "playoff_group" "text" DEFAULT 'upper'::"text" NOT NULL,
    "display_order" integer,
    CONSTRAINT "playoff_brackets_loser_position_check" CHECK (("loser_position" = ANY (ARRAY['home'::"text", 'away'::"text"]))),
    CONSTRAINT "playoff_brackets_playoff_group_check" CHECK (("playoff_group" = ANY (ARRAY['upper'::"text", 'lower'::"text"]))),
    CONSTRAINT "playoff_brackets_winner_position_check" CHECK (("winner_position" = ANY (ARRAY['home'::"text", 'away'::"text"])))
);


ALTER TABLE "public"."playoff_brackets" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."playoff_configs" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "name" "text" NOT NULL,
    "qualified_teams" integer NOT NULL,
    "playin_teams" integer NOT NULL,
    "elimination_type" "text" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "template" "text",
    CONSTRAINT "playoff_configs_elimination_type_check" CHECK (("elimination_type" = ANY (ARRAY['single'::"text", 'double'::"text"]))),
    CONSTRAINT "playoff_configs_playin_teams_check" CHECK (("playin_teams" >= 0)),
    CONSTRAINT "playoff_configs_qualified_teams_check" CHECK (("qualified_teams" >= 0))
);


ALTER TABLE "public"."playoff_configs" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."public_spec_snapshot" (
    "id" smallint DEFAULT 1 NOT NULL,
    "payload" "jsonb" NOT NULL,
    "generated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "pool_size" integer DEFAULT 0 NOT NULL,
    CONSTRAINT "public_spec_snapshot_id_check" CHECK (("id" = 1))
);


ALTER TABLE "public"."public_spec_snapshot" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."regions" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "code" "text" NOT NULL,
    "name" "text" NOT NULL,
    "standing_method" "text" DEFAULT 'lvr'::"text" NOT NULL,
    CONSTRAINT "regions_standing_method_check" CHECK (("standing_method" = ANY (ARRAY['lvr'::"text", 'points'::"text", 'points_without_bonus'::"text"])))
);


ALTER TABLE "public"."regions" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."season_awards" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "season_id" "uuid" NOT NULL,
    "player_id" "uuid" NOT NULL,
    "award_name" "text" NOT NULL,
    "awarded_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "created_by" "uuid",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "full_avatar_url" "text",
    "category" "public"."award_category" DEFAULT 'individual_winners'::"public"."award_category" NOT NULL,
    "avatar_bucket_path" "text",
    "sort_order" integer DEFAULT 0 NOT NULL
);


ALTER TABLE "public"."season_awards" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."season_podium" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "season_id" "uuid" NOT NULL,
    "team_id" "uuid" NOT NULL,
    "place" integer NOT NULL,
    "is_override" boolean DEFAULT false NOT NULL,
    "notes" "text",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "season_podium_place_check" CHECK ((("place" >= 1) AND ("place" <= 8)))
);


ALTER TABLE "public"."season_podium" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."seasons" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "region_id" "uuid" NOT NULL,
    "name" "text" NOT NULL,
    "slug" "text" NOT NULL,
    "theme" "text",
    "start_date" timestamp with time zone NOT NULL,
    "end_date" timestamp with time zone,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "playoff_config_id" "uuid",
    "playoff_started" boolean DEFAULT false NOT NULL,
    "playoff_completed" boolean DEFAULT false NOT NULL,
    "weeks" integer DEFAULT 5,
    "league_type" "text" DEFAULT 'main'::"text" NOT NULL,
    "max_players" integer DEFAULT 18 NOT NULL,
    "season_number" integer NOT NULL,
    CONSTRAINT "seasons_league_type_check" CHECK (("league_type" = ANY (ARRAY['main'::"text", 'side'::"text"]))),
    CONSTRAINT "seasons_max_players_check" CHECK (("max_players" >= 3))
);


ALTER TABLE "public"."seasons" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."sheet_configs" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "season_id" "uuid" NOT NULL,
    "sheet_id" "text" NOT NULL,
    "tab_name" "text" NOT NULL,
    "sheet_type" "text" NOT NULL,
    "header_row" integer DEFAULT 9 NOT NULL,
    "is_active" boolean DEFAULT true NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    "block_height" integer DEFAULT 18 NOT NULL,
    "block_stride" integer DEFAULT 5 NOT NULL,
    "cron_enabled" boolean DEFAULT true NOT NULL,
    CONSTRAINT "sheet_configs_sheet_type_check" CHECK (("sheet_type" = ANY (ARRAY['qualifier'::"text", 'playoff'::"text", 'teams'::"text"])))
);


ALTER TABLE "public"."sheet_configs" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."sheet_sync_logs" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "sheet_config_id" "uuid" NOT NULL,
    "synced_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "triggered_by" "text" NOT NULL,
    "status" "text" NOT NULL,
    "rows_processed" integer DEFAULT 0 NOT NULL,
    "rows_errored" integer DEFAULT 0 NOT NULL,
    "errors" "jsonb" DEFAULT '[]'::"jsonb" NOT NULL,
    "changes" "jsonb" DEFAULT '[]'::"jsonb" NOT NULL,
    CONSTRAINT "sheet_sync_logs_status_check" CHECK (("status" = ANY (ARRAY['success'::"text", 'warning'::"text", 'partial'::"text", 'failed'::"text"]))),
    CONSTRAINT "sheet_sync_logs_triggered_by_check" CHECK (("triggered_by" = ANY (ARRAY['cron'::"text", 'manual'::"text", 'rollback'::"text"])))
);


ALTER TABLE "public"."sheet_sync_logs" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."spec_bonuses" (
    "region_id" "uuid" NOT NULL,
    "upper_finalist" double precision DEFAULT 0.25 NOT NULL,
    "ladder" double precision[] DEFAULT ARRAY[(0.10)::double precision, (0.075)::double precision, (0.05)::double precision, (0.025)::double precision, (0)::double precision, (0)::double precision, (0)::double precision, (0)::double precision] NOT NULL,
    "outside" double precision DEFAULT '-0.10'::numeric NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "scope_count" boolean DEFAULT true NOT NULL,
    "scope_per_set" boolean DEFAULT false NOT NULL,
    "scope_pct" boolean DEFAULT false NOT NULL,
    CONSTRAINT "spec_bonuses_ladder_check" CHECK (("array_length"("ladder", 1) = 8))
);


ALTER TABLE "public"."spec_bonuses" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."spec_requirements" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "spec_id" "uuid" NOT NULL,
    "tier" "text" NOT NULL,
    "stat_key" "text" NOT NULL,
    "min_value" numeric NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "spec_requirements_tier_check" CHECK (("tier" = ANY (ARRAY['main'::"text", 'secondary'::"text"])))
);


ALTER TABLE "public"."spec_requirements" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."spec_winners" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "season_id" "uuid" NOT NULL,
    "spec_id" "uuid" NOT NULL,
    "player_id" "uuid" NOT NULL,
    "stars_awarded" smallint NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "spec_winners_stars_awarded_check" CHECK ((("stars_awarded" >= 0) AND ("stars_awarded" <= 5)))
);


ALTER TABLE "public"."spec_winners" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."specs" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "name" "text" NOT NULL,
    "stars" smallint NOT NULL,
    "secondary_required" smallint DEFAULT 3 NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "position" "text" DEFAULT 'OUT'::"text" NOT NULL,
    "height" integer DEFAULT 72 NOT NULL,
    CONSTRAINT "specs_height_check" CHECK ((("height" >= 48) AND ("height" <= 96))),
    CONSTRAINT "specs_position_check" CHECK (("position" = ANY (ARRAY['OUT'::"text", 'OPP'::"text", 'MID'::"text", 'SET'::"text", 'LIB'::"text"]))),
    CONSTRAINT "specs_secondary_required_check" CHECK (("secondary_required" >= 0)),
    CONSTRAINT "specs_stars_check" CHECK ((("stars" >= 3) AND ("stars" <= 5)))
);


ALTER TABLE "public"."specs" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."teams" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "season_id" "uuid" NOT NULL,
    "name" "text" NOT NULL,
    "slug" "text" NOT NULL,
    "logo_url" "text",
    "brick_number" integer,
    "brick_color" "text",
    "previous_team_id" "uuid",
    "deleted_at" timestamp with time zone,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "starting_lvr" numeric DEFAULT 100 NOT NULL,
    "is_bye" boolean DEFAULT false NOT NULL,
    "team_number" integer,
    "logo_bg_removed" boolean DEFAULT false NOT NULL,
    "starting_points" numeric DEFAULT 0 NOT NULL
);


ALTER TABLE "public"."teams" OWNER TO "postgres";


CREATE OR REPLACE VIEW "public"."standings" AS
 SELECT "s"."id" AS "season_id",
    "s"."region_id",
    "t"."id" AS "team_id",
    "t"."name" AS "team_name",
    "t"."slug" AS "team_slug",
    "t"."logo_url" AS "team_logo_url",
    "t"."logo_bg_removed" AS "team_logo_bg_removed",
    "t"."starting_lvr",
    "count"(
        CASE
            WHEN ((("m"."home_team_id" = "t"."id") AND ("m"."home_sets_won" > "m"."away_sets_won")) OR (("m"."away_team_id" = "t"."id") AND ("m"."away_sets_won" > "m"."home_sets_won"))) THEN 1
            ELSE NULL::integer
        END) AS "wins",
    "count"(
        CASE
            WHEN ((("m"."home_team_id" = "t"."id") AND ("m"."home_sets_won" < "m"."away_sets_won")) OR (("m"."away_team_id" = "t"."id") AND ("m"."away_sets_won" < "m"."home_sets_won"))) THEN 1
            ELSE NULL::integer
        END) AS "losses",
    COALESCE("sum"(
        CASE
            WHEN ("m"."home_team_id" = "t"."id") THEN "m"."home_sets_won"
            WHEN ("m"."away_team_id" = "t"."id") THEN "m"."away_sets_won"
            ELSE NULL::integer
        END), (0)::bigint) AS "sets_won",
    COALESCE("sum"(
        CASE
            WHEN ("m"."home_team_id" = "t"."id") THEN "m"."away_sets_won"
            WHEN ("m"."away_team_id" = "t"."id") THEN "m"."home_sets_won"
            ELSE NULL::integer
        END), (0)::bigint) AS "sets_lost",
    ("t"."starting_lvr" + COALESCE("sum"(
        CASE
            WHEN ("m"."home_team_id" = "t"."id") THEN "m"."home_team_lvr"
            WHEN ("m"."away_team_id" = "t"."id") THEN "m"."away_team_lvr"
            ELSE NULL::numeric
        END), (0)::numeric)) AS "total_lvr",
    "row_number"() OVER (PARTITION BY "s"."id" ORDER BY
        CASE
            WHEN ("r"."standing_method" = ANY (ARRAY['lvr'::"text", 'points_without_bonus'::"text"])) THEN NULL::bigint
            ELSE "count"(
            CASE
                WHEN ((("m"."home_team_id" = "t"."id") AND ("m"."home_sets_won" > "m"."away_sets_won")) OR (("m"."away_team_id" = "t"."id") AND ("m"."away_sets_won" > "m"."home_sets_won"))) THEN 1
                ELSE NULL::integer
            END)
        END DESC,
        CASE
            WHEN ("r"."standing_method" = 'points'::"text") THEN (("t"."starting_points" + COALESCE("sum"(
            CASE
                WHEN ("m"."home_team_id" = "t"."id") THEN "m"."home_team_points"
                WHEN ("m"."away_team_id" = "t"."id") THEN "m"."away_team_points"
                ELSE NULL::numeric
            END), (0)::numeric)) + COALESCE("sum"(
            CASE
                WHEN ("m"."home_team_id" = "t"."id") THEN "m"."home_team_bonus"
                WHEN ("m"."away_team_id" = "t"."id") THEN "m"."away_team_bonus"
                ELSE NULL::numeric
            END), (0)::numeric))
            WHEN ("r"."standing_method" = 'points_without_bonus'::"text") THEN ("t"."starting_points" + COALESCE("sum"(
            CASE
                WHEN ("m"."home_team_id" = "t"."id") THEN "m"."home_team_points"
                WHEN ("m"."away_team_id" = "t"."id") THEN "m"."away_team_points"
                ELSE NULL::numeric
            END), (0)::numeric))
            ELSE ("t"."starting_lvr" + COALESCE("sum"(
            CASE
                WHEN ("m"."home_team_id" = "t"."id") THEN "m"."home_team_lvr"
                WHEN ("m"."away_team_id" = "t"."id") THEN "m"."away_team_lvr"
                ELSE NULL::numeric
            END), (0)::numeric))
        END DESC,
        CASE
            WHEN ("r"."standing_method" = 'points'::"text") THEN (COALESCE("sum"(
            CASE
                WHEN ("m"."home_team_id" = "t"."id") THEN "m"."home_sets_won"
                WHEN ("m"."away_team_id" = "t"."id") THEN "m"."away_sets_won"
                ELSE NULL::integer
            END), (0)::bigint))::numeric
            WHEN ("r"."standing_method" = 'points_without_bonus'::"text") THEN COALESCE("lrpd"."value", (0)::numeric)
            ELSE NULL::numeric
        END DESC,
        CASE
            WHEN ("r"."standing_method" = ANY (ARRAY['lvr'::"text", 'points_without_bonus'::"text"])) THEN NULL::bigint
            ELSE "count"(
            CASE
                WHEN ((("m"."home_team_id" = "t"."id") AND ("m"."home_sets_won" < "m"."away_sets_won")) OR (("m"."away_team_id" = "t"."id") AND ("m"."away_sets_won" < "m"."home_sets_won"))) THEN 1
                ELSE NULL::integer
            END)
        END, "t"."name") AS "rank",
    ("t"."starting_points" + COALESCE("sum"(
        CASE
            WHEN ("m"."home_team_id" = "t"."id") THEN "m"."home_team_points"
            WHEN ("m"."away_team_id" = "t"."id") THEN "m"."away_team_points"
            ELSE NULL::numeric
        END), (0)::numeric)) AS "total_points",
    COALESCE("sum"(
        CASE
            WHEN ("m"."home_team_id" = "t"."id") THEN "m"."home_team_bonus"
            WHEN ("m"."away_team_id" = "t"."id") THEN "m"."away_team_bonus"
            ELSE NULL::numeric
        END), (0)::numeric) AS "total_bonus",
    "lrpd"."value" AS "last_round_point_diff",
    "t"."starting_points"
   FROM (((("public"."teams" "t"
     JOIN "public"."seasons" "s" ON (("t"."season_id" = "s"."id")))
     JOIN "public"."regions" "r" ON (("r"."id" = "s"."region_id")))
     LEFT JOIN "public"."matches" "m" ON (((("m"."home_team_id" = "t"."id") OR ("m"."away_team_id" = "t"."id")) AND ("m"."status" = 'completed'::"public"."match_status") AND ("m"."match_type" = 'season'::"public"."match_type"))))
     LEFT JOIN LATERAL ( SELECT
                CASE
                    WHEN ("lm"."home_team_id" = "t"."id") THEN "lm"."point_diff"
                    ELSE (- "lm"."point_diff")
                END AS "value"
           FROM "public"."matches" "lm"
          WHERE ((("lm"."home_team_id" = "t"."id") OR ("lm"."away_team_id" = "t"."id")) AND ("lm"."status" = 'completed'::"public"."match_status") AND ("lm"."match_type" = 'season'::"public"."match_type"))
          ORDER BY "lm"."scheduled_at" DESC NULLS LAST
         LIMIT 1) "lrpd" ON (true))
  WHERE (("t"."deleted_at" IS NULL) AND ("t"."is_bye" = false))
  GROUP BY "s"."id", "s"."region_id", "t"."id", "t"."name", "t"."slug", "t"."logo_url", "t"."logo_bg_removed", "t"."starting_lvr", "t"."starting_points", "r"."standing_method", "lrpd"."value";


ALTER VIEW "public"."standings" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."team_name_history" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "team_id" "uuid" NOT NULL,
    "old_name" "text" NOT NULL,
    "new_name" "text" NOT NULL,
    "changed_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."team_name_history" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."user_roles" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "role" "text",
    "promoted_by" "uuid",
    "promoted_at" timestamp with time zone DEFAULT "now"(),
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone,
    CONSTRAINT "user_roles_role_check" CHECK (("role" = ANY (ARRAY['super_admin'::"text", 'admin'::"text", 'stat_tracker'::"text", 'staff'::"text", 'spec_manager'::"text", 'none'::"text"])))
);


ALTER TABLE "public"."user_roles" OWNER TO "postgres";


CREATE OR REPLACE VIEW "public"."v_player_season_stats" AS
 SELECT "player_id",
    "season_id",
    "sets_played",
    "matches_played",
    "ape_kills_per_set",
    "ape_attempts_per_set",
    "delay_kills_per_set",
    "quick_kills_per_set",
    "wipes_tools_per_set",
    "kills_per_set",
    "kill_attempts_per_set",
    "spiking_errors_per_set",
    "assists_per_set",
    "setting_errors_per_set",
    "kill_blocks_per_set",
    "block_touches_per_set",
    "blocks_per_set",
    "serve_receives_per_set",
    "digs_per_set",
    "block_follows_per_set",
    "dives_per_set",
    "receives_per_set",
    "aces_per_set",
    "service_errors_per_set",
    "service_score",
    "misc_errors_per_set",
    "errors_per_set",
    "hit_eff",
    "kb_pct",
    "set_eff",
    "points_total",
    "points_per_set",
    "kill_blocks_total",
    "block_touches_total",
    "assists_total",
    "setting_errors_total",
    "serve_receives_total",
    "digs_total",
    "block_follows_total",
    "dives_total",
    "ape_kills_total",
    "delay_kills_total",
    "quick_kills_total",
    "wipes_tools_total",
    "spiking_errors_total",
    "aces_total",
    "service_errors_total",
    "kills_total",
    "blocks_total",
    "receives_total",
    "kill_attempts_total",
    "ape_attempts_total",
    "misc_errors_total",
    "receive_errors_total",
    "rec_eff",
    "errors_total",
    "jump_serve_aces_total",
    "float_aces_total",
    "jump_serve_aces_per_set",
    "float_aces_per_set"
   FROM "public"."get_player_season_stats_ranged"() "get_player_season_stats_ranged"("player_id", "season_id", "sets_played", "matches_played", "ape_kills_per_set", "ape_attempts_per_set", "delay_kills_per_set", "quick_kills_per_set", "wipes_tools_per_set", "kills_per_set", "kill_attempts_per_set", "spiking_errors_per_set", "assists_per_set", "setting_errors_per_set", "kill_blocks_per_set", "block_touches_per_set", "blocks_per_set", "serve_receives_per_set", "digs_per_set", "block_follows_per_set", "dives_per_set", "receives_per_set", "aces_per_set", "service_errors_per_set", "service_score", "misc_errors_per_set", "errors_per_set", "hit_eff", "kb_pct", "set_eff", "points_total", "points_per_set", "kill_blocks_total", "block_touches_total", "assists_total", "setting_errors_total", "serve_receives_total", "digs_total", "block_follows_total", "dives_total", "ape_kills_total", "delay_kills_total", "quick_kills_total", "wipes_tools_total", "spiking_errors_total", "aces_total", "service_errors_total", "kills_total", "blocks_total", "receives_total", "kill_attempts_total", "ape_attempts_total", "misc_errors_total", "receive_errors_total", "rec_eff", "errors_total", "jump_serve_aces_total", "float_aces_total", "jump_serve_aces_per_set", "float_aces_per_set");


ALTER VIEW "public"."v_player_season_stats" OWNER TO "postgres";


CREATE OR REPLACE VIEW "public"."v_leaderboard_identity" AS
 SELECT DISTINCT "id",
    "username",
    "display_name",
    "avatar_url"
   FROM "public"."players" "p"
  WHERE (EXISTS ( SELECT 1
           FROM "public"."v_player_season_stats" "v"
          WHERE ("v"."player_id" = "p"."id")));


ALTER VIEW "public"."v_leaderboard_identity" OWNER TO "postgres";


CREATE OR REPLACE VIEW "public"."v_matches_with_stats" AS
 SELECT DISTINCT "match_id"
   FROM "public"."player_match_stats";


ALTER VIEW "public"."v_matches_with_stats" OWNER TO "postgres";


CREATE OR REPLACE VIEW "public"."v_player_leaderboard" AS
 SELECT "v"."player_id",
    "v"."season_id",
    "v"."sets_played",
    "v"."matches_played",
    "v"."ape_kills_per_set",
    "v"."ape_attempts_per_set",
    "v"."delay_kills_per_set",
    "v"."quick_kills_per_set",
    "v"."wipes_tools_per_set",
    "v"."kills_per_set",
    "v"."kill_attempts_per_set",
    "v"."spiking_errors_per_set",
    "v"."assists_per_set",
    "v"."setting_errors_per_set",
    "v"."kill_blocks_per_set",
    "v"."block_touches_per_set",
    "v"."blocks_per_set",
    "v"."serve_receives_per_set",
    "v"."digs_per_set",
    "v"."block_follows_per_set",
    "v"."dives_per_set",
    "v"."receives_per_set",
    "v"."aces_per_set",
    "v"."service_errors_per_set",
    "v"."service_score",
    "v"."misc_errors_per_set",
    "v"."errors_per_set",
    "v"."hit_eff",
    "v"."kb_pct",
    "v"."set_eff",
    "v"."points_total",
    "v"."points_per_set",
    "v"."kill_blocks_total",
    "v"."block_touches_total",
    "v"."assists_total",
    "v"."setting_errors_total",
    "v"."serve_receives_total",
    "v"."digs_total",
    "v"."block_follows_total",
    "v"."dives_total",
    "v"."ape_kills_total",
    "v"."delay_kills_total",
    "v"."quick_kills_total",
    "v"."wipes_tools_total",
    "v"."spiking_errors_total",
    "v"."aces_total",
    "v"."service_errors_total",
    "v"."kills_total",
    "v"."blocks_total",
    "v"."receives_total",
    "v"."kill_attempts_total",
    "v"."ape_attempts_total",
    "v"."misc_errors_total",
    "v"."receive_errors_total",
    "v"."rec_eff",
    "v"."errors_total",
    "v"."jump_serve_aces_total",
    "v"."float_aces_total",
    "v"."jump_serve_aces_per_set",
    "v"."float_aces_per_set",
    "p"."username",
    "p"."display_name",
    "p"."avatar_url",
    "s"."name" AS "season_name",
    "s"."slug" AS "season_slug",
    "s"."start_date" AS "season_start_date",
    "r"."id" AS "region_id",
    "r"."code" AS "region_code",
    "t"."id" AS "team_id",
    "t"."name" AS "team_name",
    "t"."slug" AS "team_slug",
    "t"."logo_url" AS "team_logo_url",
    "t"."logo_bg_removed" AS "team_logo_bg_removed"
   FROM (((("public"."v_player_season_stats" "v"
     JOIN "public"."players" "p" ON (("p"."id" = "v"."player_id")))
     JOIN "public"."seasons" "s" ON (("s"."id" = "v"."season_id")))
     JOIN "public"."regions" "r" ON (("r"."id" = "s"."region_id")))
     LEFT JOIN LATERAL ( SELECT "tm"."id",
            "tm"."name",
            "tm"."slug",
            "tm"."logo_url",
            "tm"."logo_bg_removed"
           FROM ("public"."player_team_seasons" "pts"
             JOIN "public"."teams" "tm" ON (("tm"."id" = "pts"."team_id")))
          WHERE (("pts"."player_id" = "v"."player_id") AND ("pts"."season_id" = "v"."season_id") AND ("tm"."deleted_at" IS NULL))
          ORDER BY ("pts"."left_at" IS NULL) DESC, "pts"."joined_at" DESC
         LIMIT 1) "t" ON (true));


ALTER VIEW "public"."v_player_leaderboard" OWNER TO "postgres";


CREATE OR REPLACE VIEW "public"."v_player_match_stat_sets" AS
 WITH "derived" AS (
         SELECT "pms"."id",
            "pms"."match_id",
            "pms"."player_id",
            "pms"."team_id",
            "pms"."created_at",
            "pms"."set_number",
            "pms"."ape_kills",
            "pms"."ape_attempts",
            "pms"."delay_kills",
            "pms"."quick_kills",
            "pms"."wipes_tools",
            "pms"."kill_attempts",
            "pms"."spiking_errors",
            "pms"."assists",
            "pms"."setting_errors",
            "pms"."kill_blocks",
            "pms"."block_touches",
            "pms"."serve_receives",
            "pms"."digs",
            "pms"."block_follows",
            "pms"."dives",
            "pms"."aces",
            "pms"."service_errors",
            "pms"."misc_errors",
            "pms"."receive_errors",
            "pms"."position",
            "pms"."jump_serve_aces",
            "pms"."float_aces",
            ((("pms"."ape_kills" + "pms"."delay_kills") + "pms"."quick_kills") + "pms"."wipes_tools") AS "total_kills",
            "pms"."kill_attempts" AS "total_attempts",
            ((("pms"."spiking_errors" + "pms"."setting_errors") + "pms"."service_errors") + "pms"."misc_errors") AS "total_errors",
            ("pms"."kill_blocks" + "pms"."block_touches") AS "total_blocks",
            ((("pms"."serve_receives" + "pms"."digs") + "pms"."block_follows") + "pms"."dives") AS "total_receives",
            (("pms"."aces" + "pms"."jump_serve_aces") + "pms"."float_aces") AS "total_aces"
           FROM "public"."player_match_stats" "pms"
        )
 SELECT "d"."match_id",
    "d"."player_id",
    "d"."team_id",
    "d"."set_number",
    "p"."username",
    "p"."display_name",
    "p"."avatar_url",
    "t"."name" AS "team_name",
    "d"."ape_kills",
    "d"."ape_attempts",
    "d"."delay_kills",
    "d"."quick_kills",
    "d"."wipes_tools",
    "d"."kill_attempts",
    "d"."spiking_errors",
    "d"."assists",
    "d"."setting_errors",
    "d"."kill_blocks",
    "d"."block_touches",
    "d"."serve_receives",
    "d"."digs",
    "d"."block_follows",
    "d"."dives",
    "d"."aces",
    "d"."service_errors",
    "d"."misc_errors",
    "d"."total_kills",
    "d"."total_attempts",
    "d"."total_errors",
    "d"."total_blocks",
    "d"."total_receives",
        CASE
            WHEN ("d"."total_attempts" = 0) THEN NULL::numeric
            ELSE ((("d"."total_kills" - "d"."spiking_errors"))::numeric / ("d"."total_attempts")::numeric)
        END AS "hit_eff",
        CASE
            WHEN (("d"."assists" + "d"."setting_errors") = 0) THEN NULL::numeric
            ELSE (("d"."assists")::numeric / (("d"."assists" + "d"."setting_errors"))::numeric)
        END AS "set_eff",
        CASE
            WHEN ("d"."total_blocks" = 0) THEN NULL::numeric
            ELSE (("d"."kill_blocks")::numeric / ("d"."total_blocks")::numeric)
        END AS "kb_pct",
    ("d"."total_aces" - "d"."service_errors") AS "service_score",
    ((((("d"."total_kills" + "d"."assists") + "d"."total_blocks") + "d"."total_receives") + "d"."total_aces") - "d"."total_errors") AS "contributions",
    (("d"."total_kills" + "d"."kill_blocks") + "d"."total_aces") AS "points",
    "d"."receive_errors",
    "d"."jump_serve_aces",
    "d"."float_aces",
    "d"."total_aces",
    "d"."position"
   FROM (("derived" "d"
     JOIN "public"."players" "p" ON (("p"."id" = "d"."player_id")))
     JOIN "public"."teams" "t" ON (("t"."id" = "d"."team_id")));


ALTER VIEW "public"."v_player_match_stat_sets" OWNER TO "postgres";


CREATE OR REPLACE VIEW "public"."v_player_match_stat_totals" AS
 WITH "sums" AS (
         SELECT "pms"."match_id",
            "pms"."player_id",
            "pms"."team_id",
            "sum"("pms"."ape_kills") AS "ape_kills",
            "sum"("pms"."ape_attempts") AS "ape_attempts",
            "sum"("pms"."delay_kills") AS "delay_kills",
            "sum"("pms"."quick_kills") AS "quick_kills",
            "sum"("pms"."wipes_tools") AS "wipes_tools",
            "sum"("pms"."kill_attempts") AS "kill_attempts",
            "sum"("pms"."spiking_errors") AS "spiking_errors",
            "sum"("pms"."assists") AS "assists",
            "sum"("pms"."setting_errors") AS "setting_errors",
            "sum"("pms"."kill_blocks") AS "kill_blocks",
            "sum"("pms"."block_touches") AS "block_touches",
            "sum"("pms"."serve_receives") AS "serve_receives",
            "sum"("pms"."digs") AS "digs",
            "sum"("pms"."block_follows") AS "block_follows",
            "sum"("pms"."dives") AS "dives",
            "sum"("pms"."aces") AS "aces",
            "sum"("pms"."service_errors") AS "service_errors",
            "sum"("pms"."misc_errors") AS "misc_errors",
            "sum"("pms"."receive_errors") AS "receive_errors",
            "sum"("pms"."jump_serve_aces") AS "jump_serve_aces",
            "sum"("pms"."float_aces") AS "float_aces",
            ("count"(*) FILTER (WHERE (((((((((((((((((((("pms"."ape_kills" + "pms"."ape_attempts") + "pms"."delay_kills") + "pms"."quick_kills") + "pms"."wipes_tools") + "pms"."kill_attempts") + "pms"."spiking_errors") + "pms"."assists") + "pms"."setting_errors") + "pms"."kill_blocks") + "pms"."block_touches") + "pms"."serve_receives") + "pms"."digs") + "pms"."block_follows") + "pms"."dives") + "pms"."aces") + "pms"."jump_serve_aces") + "pms"."float_aces") + "pms"."service_errors") + "pms"."misc_errors") > 0)))::integer AS "sets_played"
           FROM "public"."player_match_stats" "pms"
          GROUP BY "pms"."match_id", "pms"."player_id", "pms"."team_id"
        ), "derived" AS (
         SELECT "s"."match_id",
            "s"."player_id",
            "s"."team_id",
            "s"."ape_kills",
            "s"."ape_attempts",
            "s"."delay_kills",
            "s"."quick_kills",
            "s"."wipes_tools",
            "s"."kill_attempts",
            "s"."spiking_errors",
            "s"."assists",
            "s"."setting_errors",
            "s"."kill_blocks",
            "s"."block_touches",
            "s"."serve_receives",
            "s"."digs",
            "s"."block_follows",
            "s"."dives",
            "s"."aces",
            "s"."service_errors",
            "s"."misc_errors",
            "s"."receive_errors",
            "s"."jump_serve_aces",
            "s"."float_aces",
            "s"."sets_played",
            ((("s"."ape_kills" + "s"."delay_kills") + "s"."quick_kills") + "s"."wipes_tools") AS "total_kills",
            "s"."kill_attempts" AS "total_attempts",
            ((("s"."spiking_errors" + "s"."setting_errors") + "s"."service_errors") + "s"."misc_errors") AS "total_errors",
            ("s"."kill_blocks" + "s"."block_touches") AS "total_blocks",
            ((("s"."serve_receives" + "s"."digs") + "s"."block_follows") + "s"."dives") AS "total_receives",
            (("s"."aces" + "s"."jump_serve_aces") + "s"."float_aces") AS "total_aces"
           FROM "sums" "s"
        )
 SELECT "d"."match_id",
    "d"."player_id",
    "d"."team_id",
    "p"."username",
    "p"."display_name",
    "p"."avatar_url",
    "t"."name" AS "team_name",
    "d"."ape_kills",
    "d"."ape_attempts",
    "d"."delay_kills",
    "d"."quick_kills",
    "d"."wipes_tools",
    "d"."kill_attempts",
    "d"."spiking_errors",
    "d"."assists",
    "d"."setting_errors",
    "d"."kill_blocks",
    "d"."block_touches",
    "d"."serve_receives",
    "d"."digs",
    "d"."block_follows",
    "d"."dives",
    "d"."aces",
    "d"."service_errors",
    "d"."misc_errors",
    "d"."sets_played",
    "d"."total_kills",
    "d"."total_attempts",
    "d"."total_errors",
    "d"."total_blocks",
    "d"."total_receives",
        CASE
            WHEN ("d"."total_attempts" = 0) THEN NULL::numeric
            ELSE ((("d"."total_kills" - "d"."spiking_errors"))::numeric / ("d"."total_attempts")::numeric)
        END AS "hit_eff",
        CASE
            WHEN (("d"."assists" + "d"."setting_errors") = 0) THEN NULL::numeric
            ELSE (("d"."assists")::numeric / (("d"."assists" + "d"."setting_errors"))::numeric)
        END AS "set_eff",
        CASE
            WHEN ("d"."total_blocks" = 0) THEN NULL::numeric
            ELSE (("d"."kill_blocks")::numeric / ("d"."total_blocks")::numeric)
        END AS "kb_pct",
    ("d"."total_aces" - "d"."service_errors") AS "service_score",
    ((((("d"."total_kills" + "d"."assists") + "d"."total_blocks") + "d"."total_receives") + "d"."total_aces") - "d"."total_errors") AS "contributions",
    (("d"."total_kills" + "d"."kill_blocks") + "d"."total_aces") AS "points",
    "d"."receive_errors",
    "d"."jump_serve_aces",
    "d"."float_aces",
    "d"."total_aces"
   FROM (("derived" "d"
     JOIN "public"."players" "p" ON (("p"."id" = "d"."player_id")))
     JOIN "public"."teams" "t" ON (("t"."id" = "d"."team_id")));


ALTER VIEW "public"."v_player_match_stat_totals" OWNER TO "postgres";


ALTER TABLE ONLY "public"."article_media"
    ADD CONSTRAINT "article_media_article_handle_key" UNIQUE ("article_id", "handle");



ALTER TABLE ONLY "public"."article_media"
    ADD CONSTRAINT "article_media_article_media_post_key" UNIQUE ("article_id", "media_post_id");



ALTER TABLE ONLY "public"."article_media"
    ADD CONSTRAINT "article_media_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."articles"
    ADD CONSTRAINT "articles_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."articles"
    ADD CONSTRAINT "articles_slug_key" UNIQUE ("slug");



ALTER TABLE ONLY "public"."cache_versions"
    ADD CONSTRAINT "cache_versions_pkey" PRIMARY KEY ("tag");



ALTER TABLE ONLY "public"."match_officials"
    ADD CONSTRAINT "match_officials_match_id_official_id_official_type_key" UNIQUE ("match_id", "player_id", "official_type");



ALTER TABLE ONLY "public"."match_officials"
    ADD CONSTRAINT "match_officials_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."match_sets"
    ADD CONSTRAINT "match_sets_match_id_set_number_key" UNIQUE ("match_id", "set_number");



ALTER TABLE ONLY "public"."match_sets"
    ADD CONSTRAINT "match_sets_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."match_sheet_config"
    ADD CONSTRAINT "match_sheet_config_match_id_key" UNIQUE ("match_id");



ALTER TABLE ONLY "public"."match_sheet_config"
    ADD CONSTRAINT "match_sheet_config_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."matches"
    ADD CONSTRAINT "matches_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."matches"
    ADD CONSTRAINT "matches_season_id_match_code_key" UNIQUE ("season_id", "match_code");



ALTER TABLE ONLY "public"."media_posts"
    ADD CONSTRAINT "media_posts_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."pending_users"
    ADD CONSTRAINT "pending_users_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."player_match_stats"
    ADD CONSTRAINT "player_match_stats_match_id_player_id_set_number_key" UNIQUE ("match_id", "player_id", "set_number");



ALTER TABLE ONLY "public"."player_match_stats"
    ADD CONSTRAINT "player_stats_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."player_team_seasons"
    ADD CONSTRAINT "player_team_seasons_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."players"
    ADD CONSTRAINT "players_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."players"
    ADD CONSTRAINT "players_roblox_user_id_key" UNIQUE ("roblox_user_id");



ALTER TABLE ONLY "public"."playoff_brackets"
    ADD CONSTRAINT "playoff_brackets_match_id_key" UNIQUE ("match_id");



ALTER TABLE ONLY "public"."playoff_brackets"
    ADD CONSTRAINT "playoff_brackets_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."playoff_configs"
    ADD CONSTRAINT "playoff_configs_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."public_spec_snapshot"
    ADD CONSTRAINT "public_spec_snapshot_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."regions"
    ADD CONSTRAINT "regions_code_key" UNIQUE ("code");



ALTER TABLE ONLY "public"."regions"
    ADD CONSTRAINT "regions_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."season_awards"
    ADD CONSTRAINT "season_awards_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."season_podium"
    ADD CONSTRAINT "season_podium_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."season_podium"
    ADD CONSTRAINT "season_podium_season_team_unique" UNIQUE ("season_id", "team_id");



ALTER TABLE ONLY "public"."seasons"
    ADD CONSTRAINT "seasons_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."seasons"
    ADD CONSTRAINT "seasons_slug_region_id_key" UNIQUE ("slug", "region_id");



ALTER TABLE ONLY "public"."sheet_configs"
    ADD CONSTRAINT "sheet_configs_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."sheet_sync_logs"
    ADD CONSTRAINT "sheet_sync_logs_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."spec_bonuses"
    ADD CONSTRAINT "spec_bonuses_pkey" PRIMARY KEY ("region_id");



ALTER TABLE ONLY "public"."spec_requirements"
    ADD CONSTRAINT "spec_requirements_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."spec_requirements"
    ADD CONSTRAINT "spec_requirements_spec_id_stat_key_key" UNIQUE ("spec_id", "stat_key");



ALTER TABLE ONLY "public"."spec_winners"
    ADD CONSTRAINT "spec_winners_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."spec_winners"
    ADD CONSTRAINT "spec_winners_season_spec_unique" UNIQUE ("season_id", "spec_id");



ALTER TABLE ONLY "public"."specs"
    ADD CONSTRAINT "specs_name_key" UNIQUE ("name");



ALTER TABLE ONLY "public"."specs"
    ADD CONSTRAINT "specs_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."team_name_history"
    ADD CONSTRAINT "team_name_history_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."teams"
    ADD CONSTRAINT "teams_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."user_roles"
    ADD CONSTRAINT "user_roles_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."user_roles"
    ADD CONSTRAINT "user_roles_user_id_key" UNIQUE ("user_id");



CREATE INDEX "article_media_article_id_idx" ON "public"."article_media" USING "btree" ("article_id");



CREATE INDEX "article_media_media_post_id_idx" ON "public"."article_media" USING "btree" ("media_post_id");



CREATE INDEX "articles_match_id_idx" ON "public"."articles" USING "btree" ("match_id") WHERE ("match_id" IS NOT NULL);



CREATE INDEX "articles_published_at_idx" ON "public"."articles" USING "btree" ("published_at" DESC NULLS LAST);



CREATE INDEX "articles_season_id_idx" ON "public"."articles" USING "btree" ("season_id") WHERE ("season_id" IS NOT NULL);



CREATE INDEX "idx_match_officials_match_id" ON "public"."match_officials" USING "btree" ("match_id");



CREATE INDEX "idx_match_officials_official_id" ON "public"."match_officials" USING "btree" ("player_id");



CREATE INDEX "idx_match_sets_match_id" ON "public"."match_sets" USING "btree" ("match_id");



CREATE INDEX "idx_matches_away_team_id" ON "public"."matches" USING "btree" ("away_team_id");



CREATE INDEX "idx_matches_home_team_id" ON "public"."matches" USING "btree" ("home_team_id");



CREATE INDEX "idx_matches_loser_mvp_player_id" ON "public"."matches" USING "btree" ("loser_mvp_player_id") WHERE ("loser_mvp_player_id" IS NOT NULL);



CREATE INDEX "idx_matches_match_mvp_player_id" ON "public"."matches" USING "btree" ("match_mvp_player_id") WHERE ("match_mvp_player_id" IS NOT NULL);



CREATE INDEX "idx_matches_scheduled_at" ON "public"."matches" USING "btree" ("scheduled_at");



CREATE INDEX "idx_matches_season_id" ON "public"."matches" USING "btree" ("season_id");



CREATE INDEX "idx_matches_status" ON "public"."matches" USING "btree" ("status");



CREATE INDEX "idx_matches_week" ON "public"."matches" USING "btree" ("week");



CREATE UNIQUE INDEX "idx_one_captain_per_team_season" ON "public"."player_team_seasons" USING "btree" ("team_id", "season_id", "role") WHERE (("role" = 'captain'::"text") AND ("left_at" IS NULL));



CREATE UNIQUE INDEX "idx_one_court_captain_per_team_season" ON "public"."player_team_seasons" USING "btree" ("team_id", "season_id", "role") WHERE (("role" = 'court_captain'::"text") AND ("left_at" IS NULL));



CREATE UNIQUE INDEX "idx_one_vice_captain_per_team_season" ON "public"."player_team_seasons" USING "btree" ("team_id", "season_id", "role") WHERE (("role" = 'vice_captain'::"text") AND ("left_at" IS NULL));



CREATE INDEX "idx_player_stats_match_id" ON "public"."player_match_stats" USING "btree" ("match_id");



CREATE INDEX "idx_player_stats_player_id" ON "public"."player_match_stats" USING "btree" ("player_id");



CREATE INDEX "idx_player_stats_team_id" ON "public"."player_match_stats" USING "btree" ("team_id");



CREATE INDEX "idx_player_team_seasons_player" ON "public"."player_team_seasons" USING "btree" ("player_id");



CREATE INDEX "idx_player_team_seasons_season" ON "public"."player_team_seasons" USING "btree" ("season_id");



CREATE INDEX "idx_player_team_seasons_team" ON "public"."player_team_seasons" USING "btree" ("team_id");



CREATE INDEX "idx_players_roblox_user_id" ON "public"."players" USING "btree" ("roblox_user_id");



CREATE INDEX "idx_playoff_brackets_loser_next" ON "public"."playoff_brackets" USING "btree" ("loser_next_bracket_id");



CREATE INDEX "idx_playoff_brackets_next" ON "public"."playoff_brackets" USING "btree" ("next_bracket_id");



CREATE INDEX "idx_playoff_brackets_round" ON "public"."playoff_brackets" USING "btree" ("round");



CREATE INDEX "idx_playoff_brackets_season" ON "public"."playoff_brackets" USING "btree" ("season_id");



CREATE INDEX "idx_seasons_region_id" ON "public"."seasons" USING "btree" ("region_id");



CREATE UNIQUE INDEX "idx_seasons_region_season_number" ON "public"."seasons" USING "btree" ("region_id", "season_number");



CREATE INDEX "idx_teams_previous_team_id" ON "public"."teams" USING "btree" ("previous_team_id") WHERE ("previous_team_id" IS NOT NULL);



CREATE INDEX "idx_teams_season_id" ON "public"."teams" USING "btree" ("season_id");



CREATE INDEX "idx_teams_slug" ON "public"."teams" USING "btree" ("slug") WHERE ("deleted_at" IS NULL);



CREATE UNIQUE INDEX "idx_teams_slug_season_active" ON "public"."teams" USING "btree" ("slug", "season_id") WHERE ("deleted_at" IS NULL);



CREATE UNIQUE INDEX "idx_unique_active_player_season" ON "public"."player_team_seasons" USING "btree" ("player_id", "season_id") WHERE ("left_at" IS NULL);



CREATE INDEX "idx_user_roles_user_id" ON "public"."user_roles" USING "btree" ("user_id");



CREATE INDEX "media_posts_article_id_idx" ON "public"."media_posts" USING "btree" ("article_id") WHERE ("article_id" IS NOT NULL);



CREATE INDEX "media_posts_match_id_idx" ON "public"."media_posts" USING "btree" ("match_id") WHERE ("match_id" IS NOT NULL);



CREATE INDEX "media_posts_player_id_idx" ON "public"."media_posts" USING "btree" ("player_id") WHERE ("player_id" IS NOT NULL);



CREATE UNIQUE INDEX "pending_users_email_lower_key" ON "public"."pending_users" USING "btree" ("lower"("email"));



CREATE INDEX "spec_requirements_spec_id_idx" ON "public"."spec_requirements" USING "btree" ("spec_id");



CREATE INDEX "spec_winners_player_id_idx" ON "public"."spec_winners" USING "btree" ("player_id");



CREATE INDEX "spec_winners_season_id_idx" ON "public"."spec_winners" USING "btree" ("season_id");



CREATE INDEX "team_name_history_team_id_changed_at_idx" ON "public"."team_name_history" USING "btree" ("team_id", "changed_at" DESC);



CREATE UNIQUE INDEX "teams_season_number_active_unique" ON "public"."teams" USING "btree" ("season_id", "team_number") WHERE ("deleted_at" IS NULL);



ALTER TABLE ONLY "public"."article_media"
    ADD CONSTRAINT "article_media_article_id_fkey" FOREIGN KEY ("article_id") REFERENCES "public"."articles"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."article_media"
    ADD CONSTRAINT "article_media_media_post_id_fkey" FOREIGN KEY ("media_post_id") REFERENCES "public"."media_posts"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."articles"
    ADD CONSTRAINT "articles_author_id_fkey" FOREIGN KEY ("author_id") REFERENCES "public"."players"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."articles"
    ADD CONSTRAINT "articles_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "auth"."users"("id");



ALTER TABLE ONLY "public"."articles"
    ADD CONSTRAINT "articles_match_id_fkey" FOREIGN KEY ("match_id") REFERENCES "public"."matches"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."articles"
    ADD CONSTRAINT "articles_season_id_fkey" FOREIGN KEY ("season_id") REFERENCES "public"."seasons"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."match_officials"
    ADD CONSTRAINT "match_officials_match_id_fkey" FOREIGN KEY ("match_id") REFERENCES "public"."matches"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."match_officials"
    ADD CONSTRAINT "match_officials_player_id_fkey" FOREIGN KEY ("player_id") REFERENCES "public"."players"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."match_sets"
    ADD CONSTRAINT "match_sets_match_id_fkey" FOREIGN KEY ("match_id") REFERENCES "public"."matches"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."match_sheet_config"
    ADD CONSTRAINT "match_sheet_config_match_id_fkey" FOREIGN KEY ("match_id") REFERENCES "public"."matches"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."matches"
    ADD CONSTRAINT "matches_away_team_id_fkey" FOREIGN KEY ("away_team_id") REFERENCES "public"."teams"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."matches"
    ADD CONSTRAINT "matches_home_team_id_fkey" FOREIGN KEY ("home_team_id") REFERENCES "public"."teams"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."matches"
    ADD CONSTRAINT "matches_loser_mvp_player_id_fkey" FOREIGN KEY ("loser_mvp_player_id") REFERENCES "public"."players"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."matches"
    ADD CONSTRAINT "matches_match_mvp_player_id_fkey" FOREIGN KEY ("match_mvp_player_id") REFERENCES "public"."players"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."matches"
    ADD CONSTRAINT "matches_season_id_fkey" FOREIGN KEY ("season_id") REFERENCES "public"."seasons"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."media_posts"
    ADD CONSTRAINT "media_posts_article_id_fkey" FOREIGN KEY ("article_id") REFERENCES "public"."articles"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."media_posts"
    ADD CONSTRAINT "media_posts_author_id_fkey" FOREIGN KEY ("author_id") REFERENCES "public"."players"("id");



ALTER TABLE ONLY "public"."media_posts"
    ADD CONSTRAINT "media_posts_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "auth"."users"("id");



ALTER TABLE ONLY "public"."media_posts"
    ADD CONSTRAINT "media_posts_match_id_fkey" FOREIGN KEY ("match_id") REFERENCES "public"."matches"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."media_posts"
    ADD CONSTRAINT "media_posts_player_id_fkey" FOREIGN KEY ("player_id") REFERENCES "public"."players"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."media_posts"
    ADD CONSTRAINT "media_posts_season_id_fkey" FOREIGN KEY ("season_id") REFERENCES "public"."seasons"("id");



ALTER TABLE ONLY "public"."media_posts"
    ADD CONSTRAINT "media_posts_team_id_fkey" FOREIGN KEY ("team_id") REFERENCES "public"."teams"("id");



ALTER TABLE ONLY "public"."pending_users"
    ADD CONSTRAINT "pending_users_invited_by_fkey" FOREIGN KEY ("invited_by") REFERENCES "auth"."users"("id");



ALTER TABLE ONLY "public"."player_match_stats"
    ADD CONSTRAINT "player_stats_match_id_fkey" FOREIGN KEY ("match_id") REFERENCES "public"."matches"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."player_match_stats"
    ADD CONSTRAINT "player_stats_player_id_fkey" FOREIGN KEY ("player_id") REFERENCES "public"."players"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."player_match_stats"
    ADD CONSTRAINT "player_stats_team_id_fkey" FOREIGN KEY ("team_id") REFERENCES "public"."teams"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."player_team_seasons"
    ADD CONSTRAINT "player_team_seasons_player_id_fkey" FOREIGN KEY ("player_id") REFERENCES "public"."players"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."player_team_seasons"
    ADD CONSTRAINT "player_team_seasons_season_id_fkey" FOREIGN KEY ("season_id") REFERENCES "public"."seasons"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."player_team_seasons"
    ADD CONSTRAINT "player_team_seasons_team_id_fkey" FOREIGN KEY ("team_id") REFERENCES "public"."teams"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."playoff_brackets"
    ADD CONSTRAINT "playoff_brackets_loser_next_bracket_id_fkey" FOREIGN KEY ("loser_next_bracket_id") REFERENCES "public"."playoff_brackets"("id");



ALTER TABLE ONLY "public"."playoff_brackets"
    ADD CONSTRAINT "playoff_brackets_match_id_fkey" FOREIGN KEY ("match_id") REFERENCES "public"."matches"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."playoff_brackets"
    ADD CONSTRAINT "playoff_brackets_next_bracket_id_fkey" FOREIGN KEY ("next_bracket_id") REFERENCES "public"."playoff_brackets"("id");



ALTER TABLE ONLY "public"."playoff_brackets"
    ADD CONSTRAINT "playoff_brackets_season_id_fkey" FOREIGN KEY ("season_id") REFERENCES "public"."seasons"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."season_awards"
    ADD CONSTRAINT "season_awards_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "auth"."users"("id");



ALTER TABLE ONLY "public"."season_awards"
    ADD CONSTRAINT "season_awards_player_id_fkey" FOREIGN KEY ("player_id") REFERENCES "public"."players"("id");



ALTER TABLE ONLY "public"."season_awards"
    ADD CONSTRAINT "season_awards_season_id_fkey" FOREIGN KEY ("season_id") REFERENCES "public"."seasons"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."season_podium"
    ADD CONSTRAINT "season_podium_season_id_fkey" FOREIGN KEY ("season_id") REFERENCES "public"."seasons"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."season_podium"
    ADD CONSTRAINT "season_podium_team_id_fkey" FOREIGN KEY ("team_id") REFERENCES "public"."teams"("id");



ALTER TABLE ONLY "public"."seasons"
    ADD CONSTRAINT "seasons_playoff_config_id_fkey" FOREIGN KEY ("playoff_config_id") REFERENCES "public"."playoff_configs"("id");



ALTER TABLE ONLY "public"."seasons"
    ADD CONSTRAINT "seasons_region_id_fkey" FOREIGN KEY ("region_id") REFERENCES "public"."regions"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."sheet_configs"
    ADD CONSTRAINT "sheet_configs_season_id_fkey" FOREIGN KEY ("season_id") REFERENCES "public"."seasons"("id");



ALTER TABLE ONLY "public"."sheet_sync_logs"
    ADD CONSTRAINT "sheet_sync_logs_sheet_config_id_fkey" FOREIGN KEY ("sheet_config_id") REFERENCES "public"."sheet_configs"("id");



ALTER TABLE ONLY "public"."spec_bonuses"
    ADD CONSTRAINT "spec_bonuses_region_id_fkey" FOREIGN KEY ("region_id") REFERENCES "public"."regions"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."spec_requirements"
    ADD CONSTRAINT "spec_requirements_spec_id_fkey" FOREIGN KEY ("spec_id") REFERENCES "public"."specs"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."spec_winners"
    ADD CONSTRAINT "spec_winners_player_id_fkey" FOREIGN KEY ("player_id") REFERENCES "public"."players"("id");



ALTER TABLE ONLY "public"."spec_winners"
    ADD CONSTRAINT "spec_winners_season_id_fkey" FOREIGN KEY ("season_id") REFERENCES "public"."seasons"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."spec_winners"
    ADD CONSTRAINT "spec_winners_spec_id_fkey" FOREIGN KEY ("spec_id") REFERENCES "public"."specs"("id") ON DELETE RESTRICT;



ALTER TABLE ONLY "public"."team_name_history"
    ADD CONSTRAINT "team_name_history_team_id_fkey" FOREIGN KEY ("team_id") REFERENCES "public"."teams"("id");



ALTER TABLE ONLY "public"."teams"
    ADD CONSTRAINT "teams_previous_team_id_fkey" FOREIGN KEY ("previous_team_id") REFERENCES "public"."teams"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."teams"
    ADD CONSTRAINT "teams_season_id_fkey" FOREIGN KEY ("season_id") REFERENCES "public"."seasons"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."user_roles"
    ADD CONSTRAINT "user_roles_promoted_by_fkey" FOREIGN KEY ("promoted_by") REFERENCES "auth"."users"("id");



ALTER TABLE ONLY "public"."user_roles"
    ADD CONSTRAINT "user_roles_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



CREATE POLICY "admins can delete article_media" ON "public"."article_media" FOR DELETE TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."user_roles"
  WHERE (("user_roles"."user_id" = ( SELECT "auth"."uid"() AS "uid")) AND ("user_roles"."role" = ANY (ARRAY['admin'::"text", 'super_admin'::"text"]))))));



CREATE POLICY "admins can delete articles" ON "public"."articles" FOR DELETE TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."user_roles"
  WHERE (("user_roles"."user_id" = ( SELECT "auth"."uid"() AS "uid")) AND ("user_roles"."role" = ANY (ARRAY['admin'::"text", 'super_admin'::"text"]))))));



CREATE POLICY "admins can delete match_officials" ON "public"."match_officials" FOR DELETE TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."user_roles"
  WHERE (("user_roles"."user_id" = ( SELECT "auth"."uid"() AS "uid")) AND ("user_roles"."role" = ANY (ARRAY['admin'::"text", 'super_admin'::"text"]))))));



CREATE POLICY "admins can delete match_sets" ON "public"."match_sets" FOR DELETE TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."user_roles"
  WHERE (("user_roles"."user_id" = ( SELECT "auth"."uid"() AS "uid")) AND ("user_roles"."role" = ANY (ARRAY['admin'::"text", 'super_admin'::"text"]))))));



CREATE POLICY "admins can delete matches" ON "public"."matches" FOR DELETE TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."user_roles"
  WHERE (("user_roles"."user_id" = ( SELECT "auth"."uid"() AS "uid")) AND ("user_roles"."role" = ANY (ARRAY['admin'::"text", 'super_admin'::"text"]))))));



CREATE POLICY "admins can delete media_posts" ON "public"."media_posts" FOR DELETE TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."user_roles"
  WHERE (("user_roles"."user_id" = ( SELECT "auth"."uid"() AS "uid")) AND ("user_roles"."role" = ANY (ARRAY['admin'::"text", 'super_admin'::"text"]))))));



CREATE POLICY "admins can delete player_team_seasons" ON "public"."player_team_seasons" FOR DELETE TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."user_roles"
  WHERE (("user_roles"."user_id" = ( SELECT "auth"."uid"() AS "uid")) AND ("user_roles"."role" = ANY (ARRAY['admin'::"text", 'super_admin'::"text"]))))));



CREATE POLICY "admins can delete playoff_brackets" ON "public"."playoff_brackets" FOR DELETE TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."user_roles"
  WHERE (("user_roles"."user_id" = ( SELECT "auth"."uid"() AS "uid")) AND ("user_roles"."role" = ANY (ARRAY['admin'::"text", 'super_admin'::"text"]))))));



CREATE POLICY "admins can delete playoff_configs" ON "public"."playoff_configs" FOR DELETE TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."user_roles"
  WHERE (("user_roles"."user_id" = ( SELECT "auth"."uid"() AS "uid")) AND ("user_roles"."role" = ANY (ARRAY['admin'::"text", 'super_admin'::"text"]))))));



CREATE POLICY "admins can delete season_awards" ON "public"."season_awards" FOR DELETE TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."user_roles"
  WHERE (("user_roles"."user_id" = ( SELECT "auth"."uid"() AS "uid")) AND ("user_roles"."role" = ANY (ARRAY['admin'::"text", 'super_admin'::"text"]))))));



CREATE POLICY "admins can delete sheet_sync_logs" ON "public"."sheet_sync_logs" FOR DELETE TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."user_roles"
  WHERE (("user_roles"."user_id" = ( SELECT "auth"."uid"() AS "uid")) AND ("user_roles"."role" = ANY (ARRAY['admin'::"text", 'super_admin'::"text"]))))));



CREATE POLICY "admins can delete spec_requirements" ON "public"."spec_requirements" FOR DELETE TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."user_roles"
  WHERE (("user_roles"."user_id" = ( SELECT "auth"."uid"() AS "uid")) AND ("user_roles"."role" = ANY (ARRAY['admin'::"text", 'super_admin'::"text", 'spec_manager'::"text"]))))));



CREATE POLICY "admins can delete specs" ON "public"."specs" FOR DELETE TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."user_roles"
  WHERE (("user_roles"."user_id" = ( SELECT "auth"."uid"() AS "uid")) AND ("user_roles"."role" = ANY (ARRAY['admin'::"text", 'super_admin'::"text", 'spec_manager'::"text"]))))));



CREATE POLICY "admins can insert article_media" ON "public"."article_media" FOR INSERT TO "authenticated" WITH CHECK ((EXISTS ( SELECT 1
   FROM "public"."user_roles"
  WHERE (("user_roles"."user_id" = ( SELECT "auth"."uid"() AS "uid")) AND ("user_roles"."role" = ANY (ARRAY['admin'::"text", 'super_admin'::"text"]))))));



CREATE POLICY "admins can insert articles" ON "public"."articles" FOR INSERT TO "authenticated" WITH CHECK ((EXISTS ( SELECT 1
   FROM "public"."user_roles"
  WHERE (("user_roles"."user_id" = ( SELECT "auth"."uid"() AS "uid")) AND ("user_roles"."role" = ANY (ARRAY['admin'::"text", 'super_admin'::"text"]))))));



CREATE POLICY "admins can insert match_officials" ON "public"."match_officials" FOR INSERT TO "authenticated" WITH CHECK ((EXISTS ( SELECT 1
   FROM "public"."user_roles"
  WHERE (("user_roles"."user_id" = ( SELECT "auth"."uid"() AS "uid")) AND ("user_roles"."role" = ANY (ARRAY['admin'::"text", 'super_admin'::"text"]))))));



CREATE POLICY "admins can insert match_sets" ON "public"."match_sets" FOR INSERT TO "authenticated" WITH CHECK ((EXISTS ( SELECT 1
   FROM "public"."user_roles"
  WHERE (("user_roles"."user_id" = ( SELECT "auth"."uid"() AS "uid")) AND ("user_roles"."role" = ANY (ARRAY['admin'::"text", 'super_admin'::"text"]))))));



CREATE POLICY "admins can insert matches" ON "public"."matches" FOR INSERT TO "authenticated" WITH CHECK ((EXISTS ( SELECT 1
   FROM "public"."user_roles"
  WHERE (("user_roles"."user_id" = ( SELECT "auth"."uid"() AS "uid")) AND ("user_roles"."role" = ANY (ARRAY['admin'::"text", 'super_admin'::"text"]))))));



CREATE POLICY "admins can insert media_posts" ON "public"."media_posts" FOR INSERT TO "authenticated" WITH CHECK ((EXISTS ( SELECT 1
   FROM "public"."user_roles"
  WHERE (("user_roles"."user_id" = ( SELECT "auth"."uid"() AS "uid")) AND ("user_roles"."role" = ANY (ARRAY['admin'::"text", 'super_admin'::"text"]))))));



CREATE POLICY "admins can insert player_team_seasons" ON "public"."player_team_seasons" FOR INSERT TO "authenticated" WITH CHECK ((EXISTS ( SELECT 1
   FROM "public"."user_roles"
  WHERE (("user_roles"."user_id" = ( SELECT "auth"."uid"() AS "uid")) AND ("user_roles"."role" = ANY (ARRAY['admin'::"text", 'super_admin'::"text"]))))));



CREATE POLICY "admins can insert players" ON "public"."players" FOR INSERT TO "authenticated" WITH CHECK ((EXISTS ( SELECT 1
   FROM "public"."user_roles"
  WHERE (("user_roles"."user_id" = ( SELECT "auth"."uid"() AS "uid")) AND ("user_roles"."role" = ANY (ARRAY['admin'::"text", 'super_admin'::"text"]))))));



CREATE POLICY "admins can insert playoff_brackets" ON "public"."playoff_brackets" FOR INSERT TO "authenticated" WITH CHECK ((EXISTS ( SELECT 1
   FROM "public"."user_roles"
  WHERE (("user_roles"."user_id" = ( SELECT "auth"."uid"() AS "uid")) AND ("user_roles"."role" = ANY (ARRAY['admin'::"text", 'super_admin'::"text"]))))));



CREATE POLICY "admins can insert playoff_configs" ON "public"."playoff_configs" FOR INSERT TO "authenticated" WITH CHECK ((EXISTS ( SELECT 1
   FROM "public"."user_roles"
  WHERE (("user_roles"."user_id" = ( SELECT "auth"."uid"() AS "uid")) AND ("user_roles"."role" = ANY (ARRAY['admin'::"text", 'super_admin'::"text"]))))));



CREATE POLICY "admins can insert regions" ON "public"."regions" FOR INSERT TO "authenticated" WITH CHECK ((EXISTS ( SELECT 1
   FROM "public"."user_roles"
  WHERE (("user_roles"."user_id" = "auth"."uid"()) AND ("user_roles"."role" = ANY (ARRAY['admin'::"text", 'super_admin'::"text"]))))));



CREATE POLICY "admins can insert season_awards" ON "public"."season_awards" FOR INSERT TO "authenticated" WITH CHECK ((EXISTS ( SELECT 1
   FROM "public"."user_roles"
  WHERE (("user_roles"."user_id" = ( SELECT "auth"."uid"() AS "uid")) AND ("user_roles"."role" = ANY (ARRAY['admin'::"text", 'super_admin'::"text"]))))));



CREATE POLICY "admins can insert season_podium" ON "public"."season_podium" FOR INSERT TO "authenticated" WITH CHECK ((EXISTS ( SELECT 1
   FROM "public"."user_roles"
  WHERE (("user_roles"."user_id" = ( SELECT "auth"."uid"() AS "uid")) AND ("user_roles"."role" = ANY (ARRAY['admin'::"text", 'super_admin'::"text"]))))));



CREATE POLICY "admins can insert seasons" ON "public"."seasons" FOR INSERT TO "authenticated" WITH CHECK ((EXISTS ( SELECT 1
   FROM "public"."user_roles"
  WHERE (("user_roles"."user_id" = ( SELECT "auth"."uid"() AS "uid")) AND ("user_roles"."role" = ANY (ARRAY['admin'::"text", 'super_admin'::"text"]))))));



CREATE POLICY "admins can insert sheet_configs" ON "public"."sheet_configs" FOR INSERT TO "authenticated" WITH CHECK ((EXISTS ( SELECT 1
   FROM "public"."user_roles"
  WHERE (("user_roles"."user_id" = ( SELECT "auth"."uid"() AS "uid")) AND ("user_roles"."role" = ANY (ARRAY['admin'::"text", 'super_admin'::"text"]))))));



CREATE POLICY "admins can insert sheet_sync_logs" ON "public"."sheet_sync_logs" FOR INSERT TO "authenticated" WITH CHECK ((EXISTS ( SELECT 1
   FROM "public"."user_roles"
  WHERE (("user_roles"."user_id" = ( SELECT "auth"."uid"() AS "uid")) AND ("user_roles"."role" = ANY (ARRAY['admin'::"text", 'super_admin'::"text"]))))));



CREATE POLICY "admins can insert spec_requirements" ON "public"."spec_requirements" FOR INSERT TO "authenticated" WITH CHECK ((EXISTS ( SELECT 1
   FROM "public"."user_roles"
  WHERE (("user_roles"."user_id" = ( SELECT "auth"."uid"() AS "uid")) AND ("user_roles"."role" = ANY (ARRAY['admin'::"text", 'super_admin'::"text", 'spec_manager'::"text"]))))));



CREATE POLICY "admins can insert specs" ON "public"."specs" FOR INSERT TO "authenticated" WITH CHECK ((EXISTS ( SELECT 1
   FROM "public"."user_roles"
  WHERE (("user_roles"."user_id" = ( SELECT "auth"."uid"() AS "uid")) AND ("user_roles"."role" = ANY (ARRAY['admin'::"text", 'super_admin'::"text", 'spec_manager'::"text"]))))));



CREATE POLICY "admins can insert team_name_history" ON "public"."team_name_history" FOR INSERT TO "authenticated" WITH CHECK ((EXISTS ( SELECT 1
   FROM "public"."user_roles"
  WHERE (("user_roles"."user_id" = ( SELECT "auth"."uid"() AS "uid")) AND ("user_roles"."role" = ANY (ARRAY['admin'::"text", 'super_admin'::"text"]))))));



CREATE POLICY "admins can insert teams" ON "public"."teams" FOR INSERT TO "authenticated" WITH CHECK ((EXISTS ( SELECT 1
   FROM "public"."user_roles"
  WHERE (("user_roles"."user_id" = ( SELECT "auth"."uid"() AS "uid")) AND ("user_roles"."role" = ANY (ARRAY['admin'::"text", 'super_admin'::"text"]))))));



CREATE POLICY "admins can read all articles" ON "public"."articles" FOR SELECT TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."user_roles"
  WHERE (("user_roles"."user_id" = ( SELECT "auth"."uid"() AS "uid")) AND ("user_roles"."role" = ANY (ARRAY['admin'::"text", 'super_admin'::"text"]))))));



CREATE POLICY "admins can read spec_requirements" ON "public"."spec_requirements" FOR SELECT TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."user_roles"
  WHERE (("user_roles"."user_id" = ( SELECT "auth"."uid"() AS "uid")) AND ("user_roles"."role" = ANY (ARRAY['admin'::"text", 'super_admin'::"text", 'spec_manager'::"text"]))))));



CREATE POLICY "admins can update article_media" ON "public"."article_media" FOR UPDATE TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."user_roles"
  WHERE (("user_roles"."user_id" = ( SELECT "auth"."uid"() AS "uid")) AND ("user_roles"."role" = ANY (ARRAY['admin'::"text", 'super_admin'::"text"]))))));



CREATE POLICY "admins can update articles" ON "public"."articles" FOR UPDATE TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."user_roles"
  WHERE (("user_roles"."user_id" = ( SELECT "auth"."uid"() AS "uid")) AND ("user_roles"."role" = ANY (ARRAY['admin'::"text", 'super_admin'::"text"]))))));



CREATE POLICY "admins can update match_officials" ON "public"."match_officials" FOR UPDATE TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."user_roles"
  WHERE (("user_roles"."user_id" = ( SELECT "auth"."uid"() AS "uid")) AND ("user_roles"."role" = ANY (ARRAY['admin'::"text", 'super_admin'::"text"]))))));



CREATE POLICY "admins can update match_sets" ON "public"."match_sets" FOR UPDATE TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."user_roles"
  WHERE (("user_roles"."user_id" = ( SELECT "auth"."uid"() AS "uid")) AND ("user_roles"."role" = ANY (ARRAY['admin'::"text", 'super_admin'::"text"]))))));



CREATE POLICY "admins can update matches" ON "public"."matches" FOR UPDATE TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."user_roles"
  WHERE (("user_roles"."user_id" = ( SELECT "auth"."uid"() AS "uid")) AND ("user_roles"."role" = ANY (ARRAY['admin'::"text", 'super_admin'::"text"]))))));



CREATE POLICY "admins can update media_posts" ON "public"."media_posts" FOR UPDATE TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."user_roles"
  WHERE (("user_roles"."user_id" = ( SELECT "auth"."uid"() AS "uid")) AND ("user_roles"."role" = ANY (ARRAY['admin'::"text", 'super_admin'::"text"]))))));



CREATE POLICY "admins can update player_team_seasons" ON "public"."player_team_seasons" FOR UPDATE TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."user_roles"
  WHERE (("user_roles"."user_id" = ( SELECT "auth"."uid"() AS "uid")) AND ("user_roles"."role" = ANY (ARRAY['admin'::"text", 'super_admin'::"text"])))))) WITH CHECK ((EXISTS ( SELECT 1
   FROM "public"."user_roles"
  WHERE (("user_roles"."user_id" = ( SELECT "auth"."uid"() AS "uid")) AND ("user_roles"."role" = ANY (ARRAY['admin'::"text", 'super_admin'::"text"]))))));



CREATE POLICY "admins can update players" ON "public"."players" FOR UPDATE TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."user_roles"
  WHERE (("user_roles"."user_id" = ( SELECT "auth"."uid"() AS "uid")) AND ("user_roles"."role" = ANY (ARRAY['admin'::"text", 'super_admin'::"text"]))))));



CREATE POLICY "admins can update playoff_brackets" ON "public"."playoff_brackets" FOR UPDATE TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."user_roles"
  WHERE (("user_roles"."user_id" = ( SELECT "auth"."uid"() AS "uid")) AND ("user_roles"."role" = ANY (ARRAY['admin'::"text", 'super_admin'::"text"])))))) WITH CHECK ((EXISTS ( SELECT 1
   FROM "public"."user_roles"
  WHERE (("user_roles"."user_id" = ( SELECT "auth"."uid"() AS "uid")) AND ("user_roles"."role" = ANY (ARRAY['admin'::"text", 'super_admin'::"text"]))))));



CREATE POLICY "admins can update playoff_configs" ON "public"."playoff_configs" FOR UPDATE TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."user_roles"
  WHERE (("user_roles"."user_id" = ( SELECT "auth"."uid"() AS "uid")) AND ("user_roles"."role" = ANY (ARRAY['admin'::"text", 'super_admin'::"text"])))))) WITH CHECK ((EXISTS ( SELECT 1
   FROM "public"."user_roles"
  WHERE (("user_roles"."user_id" = ( SELECT "auth"."uid"() AS "uid")) AND ("user_roles"."role" = ANY (ARRAY['admin'::"text", 'super_admin'::"text"]))))));



CREATE POLICY "admins can update regions" ON "public"."regions" FOR UPDATE TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."user_roles"
  WHERE (("user_roles"."user_id" = "auth"."uid"()) AND ("user_roles"."role" = ANY (ARRAY['admin'::"text", 'super_admin'::"text"]))))));



CREATE POLICY "admins can update season_awards" ON "public"."season_awards" FOR UPDATE TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."user_roles"
  WHERE (("user_roles"."user_id" = ( SELECT "auth"."uid"() AS "uid")) AND ("user_roles"."role" = ANY (ARRAY['admin'::"text", 'super_admin'::"text"]))))));



CREATE POLICY "admins can update season_podium" ON "public"."season_podium" FOR UPDATE TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."user_roles"
  WHERE (("user_roles"."user_id" = ( SELECT "auth"."uid"() AS "uid")) AND ("user_roles"."role" = ANY (ARRAY['admin'::"text", 'super_admin'::"text"]))))));



CREATE POLICY "admins can update seasons" ON "public"."seasons" FOR UPDATE TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."user_roles"
  WHERE (("user_roles"."user_id" = ( SELECT "auth"."uid"() AS "uid")) AND ("user_roles"."role" = ANY (ARRAY['admin'::"text", 'super_admin'::"text"]))))));



CREATE POLICY "admins can update sheet_configs" ON "public"."sheet_configs" FOR UPDATE TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."user_roles"
  WHERE (("user_roles"."user_id" = ( SELECT "auth"."uid"() AS "uid")) AND ("user_roles"."role" = ANY (ARRAY['admin'::"text", 'super_admin'::"text"]))))));



CREATE POLICY "admins can update spec_requirements" ON "public"."spec_requirements" FOR UPDATE TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."user_roles"
  WHERE (("user_roles"."user_id" = ( SELECT "auth"."uid"() AS "uid")) AND ("user_roles"."role" = ANY (ARRAY['admin'::"text", 'super_admin'::"text", 'spec_manager'::"text"]))))));



CREATE POLICY "admins can update specs" ON "public"."specs" FOR UPDATE TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."user_roles"
  WHERE (("user_roles"."user_id" = ( SELECT "auth"."uid"() AS "uid")) AND ("user_roles"."role" = ANY (ARRAY['admin'::"text", 'super_admin'::"text", 'spec_manager'::"text"]))))));



CREATE POLICY "admins can update teams" ON "public"."teams" FOR UPDATE TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."user_roles"
  WHERE (("user_roles"."user_id" = ( SELECT "auth"."uid"() AS "uid")) AND ("user_roles"."role" = ANY (ARRAY['admin'::"text", 'super_admin'::"text"]))))));



CREATE POLICY "anyone can read article_media" ON "public"."article_media" FOR SELECT TO "authenticated", "anon" USING (true);



CREATE POLICY "anyone can read cache_versions" ON "public"."cache_versions" FOR SELECT TO "authenticated", "anon" USING (true);



CREATE POLICY "anyone can read match_officials" ON "public"."match_officials" FOR SELECT TO "authenticated", "anon" USING (true);



CREATE POLICY "anyone can read match_sets" ON "public"."match_sets" FOR SELECT TO "authenticated", "anon" USING (true);



CREATE POLICY "anyone can read match_sheet_config" ON "public"."match_sheet_config" FOR SELECT TO "authenticated", "anon" USING (true);



CREATE POLICY "anyone can read matches" ON "public"."matches" FOR SELECT TO "authenticated", "anon" USING (true);



CREATE POLICY "anyone can read media_posts" ON "public"."media_posts" FOR SELECT TO "authenticated", "anon" USING (true);



CREATE POLICY "anyone can read player_match_stats" ON "public"."player_match_stats" FOR SELECT TO "authenticated", "anon" USING (true);



CREATE POLICY "anyone can read player_team_seasons" ON "public"."player_team_seasons" FOR SELECT TO "authenticated", "anon" USING (true);



CREATE POLICY "anyone can read players" ON "public"."players" FOR SELECT TO "authenticated", "anon" USING (true);



CREATE POLICY "anyone can read playoff_brackets" ON "public"."playoff_brackets" FOR SELECT TO "authenticated", "anon" USING (true);



CREATE POLICY "anyone can read playoff_configs" ON "public"."playoff_configs" FOR SELECT TO "authenticated", "anon" USING (true);



CREATE POLICY "anyone can read published articles" ON "public"."articles" FOR SELECT TO "authenticated", "anon" USING (("published_at" IS NOT NULL));



CREATE POLICY "anyone can read regions" ON "public"."regions" FOR SELECT TO "authenticated", "anon" USING (true);



CREATE POLICY "anyone can read season_awards" ON "public"."season_awards" FOR SELECT TO "authenticated", "anon" USING (true);



CREATE POLICY "anyone can read season_podium" ON "public"."season_podium" FOR SELECT TO "authenticated", "anon" USING (true);



CREATE POLICY "anyone can read seasons" ON "public"."seasons" FOR SELECT TO "authenticated", "anon" USING (true);



CREATE POLICY "anyone can read sheet_configs" ON "public"."sheet_configs" FOR SELECT TO "authenticated", "anon" USING (true);



CREATE POLICY "anyone can read sheet_sync_logs" ON "public"."sheet_sync_logs" FOR SELECT TO "authenticated", "anon" USING (true);



CREATE POLICY "anyone can read spec snapshot" ON "public"."public_spec_snapshot" FOR SELECT TO "authenticated", "anon" USING (true);



CREATE POLICY "anyone can read spec_winners" ON "public"."spec_winners" FOR SELECT TO "authenticated", "anon" USING (true);



CREATE POLICY "anyone can read specs" ON "public"."specs" FOR SELECT TO "authenticated", "anon" USING (true);



CREATE POLICY "anyone can read team_name_history" ON "public"."team_name_history" FOR SELECT TO "authenticated", "anon" USING (true);



CREATE POLICY "anyone can read teams" ON "public"."teams" FOR SELECT TO "authenticated", "anon" USING (true);



ALTER TABLE "public"."article_media" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."articles" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."cache_versions" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "invitee_read_own_invite" ON "public"."pending_users" FOR SELECT TO "authenticated", "anon" USING (("email" = ("auth"."jwt"() ->> 'email'::"text")));



ALTER TABLE "public"."match_officials" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."match_sets" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."match_sheet_config" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."matches" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."media_posts" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."pending_users" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."player_match_stats" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."player_team_seasons" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."players" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."playoff_brackets" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."playoff_configs" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."public_spec_snapshot" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "read_own_role" ON "public"."user_roles" FOR SELECT TO "authenticated" USING (("user_id" = "auth"."uid"()));



ALTER TABLE "public"."regions" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."season_awards" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."season_podium" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."seasons" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "service_role_all" ON "public"."user_roles" TO "service_role" USING (("role" = 'super_admin'::"text"));



ALTER TABLE "public"."sheet_configs" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."sheet_sync_logs" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "spec managers can manage spec bonuses" ON "public"."spec_bonuses" TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."user_roles"
  WHERE (("user_roles"."user_id" = ( SELECT "auth"."uid"() AS "uid")) AND ("user_roles"."role" = ANY (ARRAY['admin'::"text", 'super_admin'::"text", 'spec_manager'::"text"])))))) WITH CHECK ((EXISTS ( SELECT 1
   FROM "public"."user_roles"
  WHERE (("user_roles"."user_id" = ( SELECT "auth"."uid"() AS "uid")) AND ("user_roles"."role" = ANY (ARRAY['admin'::"text", 'super_admin'::"text", 'spec_manager'::"text"]))))));



CREATE POLICY "spec managers can manage spec_winners" ON "public"."spec_winners" TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."user_roles"
  WHERE (("user_roles"."user_id" = ( SELECT "auth"."uid"() AS "uid")) AND ("user_roles"."role" = ANY (ARRAY['admin'::"text", 'super_admin'::"text", 'spec_manager'::"text"])))))) WITH CHECK ((EXISTS ( SELECT 1
   FROM "public"."user_roles"
  WHERE (("user_roles"."user_id" = ( SELECT "auth"."uid"() AS "uid")) AND ("user_roles"."role" = ANY (ARRAY['admin'::"text", 'super_admin'::"text", 'spec_manager'::"text"]))))));



CREATE POLICY "spec managers can upsert spec snapshot" ON "public"."public_spec_snapshot" TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."user_roles"
  WHERE (("user_roles"."user_id" = ( SELECT "auth"."uid"() AS "uid")) AND ("user_roles"."role" = ANY (ARRAY['admin'::"text", 'super_admin'::"text", 'spec_manager'::"text"])))))) WITH CHECK ((EXISTS ( SELECT 1
   FROM "public"."user_roles"
  WHERE (("user_roles"."user_id" = ( SELECT "auth"."uid"() AS "uid")) AND ("user_roles"."role" = ANY (ARRAY['admin'::"text", 'super_admin'::"text", 'spec_manager'::"text"]))))));



ALTER TABLE "public"."spec_bonuses" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."spec_requirements" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."spec_winners" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."specs" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "stat managers can delete match_sheet_config" ON "public"."match_sheet_config" FOR DELETE TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."user_roles"
  WHERE (("user_roles"."user_id" = ( SELECT "auth"."uid"() AS "uid")) AND ("user_roles"."role" = ANY (ARRAY['stat_tracker'::"text", 'admin'::"text", 'super_admin'::"text"]))))));



CREATE POLICY "stat managers can delete player_match_stats" ON "public"."player_match_stats" FOR DELETE TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."user_roles"
  WHERE (("user_roles"."user_id" = ( SELECT "auth"."uid"() AS "uid")) AND ("user_roles"."role" = ANY (ARRAY['stat_tracker'::"text", 'admin'::"text", 'super_admin'::"text"]))))));



CREATE POLICY "stat managers can insert match_sheet_config" ON "public"."match_sheet_config" FOR INSERT TO "authenticated" WITH CHECK ((EXISTS ( SELECT 1
   FROM "public"."user_roles"
  WHERE (("user_roles"."user_id" = ( SELECT "auth"."uid"() AS "uid")) AND ("user_roles"."role" = ANY (ARRAY['stat_tracker'::"text", 'admin'::"text", 'super_admin'::"text"]))))));



CREATE POLICY "stat managers can insert player_match_stats" ON "public"."player_match_stats" FOR INSERT TO "authenticated" WITH CHECK ((EXISTS ( SELECT 1
   FROM "public"."user_roles"
  WHERE (("user_roles"."user_id" = ( SELECT "auth"."uid"() AS "uid")) AND ("user_roles"."role" = ANY (ARRAY['stat_tracker'::"text", 'admin'::"text", 'super_admin'::"text"]))))));



CREATE POLICY "stat managers can update match_sheet_config" ON "public"."match_sheet_config" FOR UPDATE TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."user_roles"
  WHERE (("user_roles"."user_id" = ( SELECT "auth"."uid"() AS "uid")) AND ("user_roles"."role" = ANY (ARRAY['stat_tracker'::"text", 'admin'::"text", 'super_admin'::"text"]))))));



CREATE POLICY "stat managers can update player_match_stats" ON "public"."player_match_stats" FOR UPDATE TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."user_roles"
  WHERE (("user_roles"."user_id" = ( SELECT "auth"."uid"() AS "uid")) AND ("user_roles"."role" = ANY (ARRAY['stat_tracker'::"text", 'admin'::"text", 'super_admin'::"text"]))))));



CREATE POLICY "super_admin_can_invite" ON "public"."pending_users" FOR INSERT TO "authenticated" WITH CHECK ((EXISTS ( SELECT 1
   FROM "public"."user_roles" "ur"
  WHERE (("ur"."user_id" = "auth"."uid"()) AND ("ur"."role" = 'super_admin'::"text")))));



CREATE POLICY "super_admin_read_pending" ON "public"."pending_users" FOR SELECT TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."user_roles" "ur"
  WHERE (("ur"."user_id" = "auth"."uid"()) AND ("ur"."role" = 'super_admin'::"text")))));



CREATE POLICY "super_admins can delete players" ON "public"."players" FOR DELETE TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."user_roles"
  WHERE (("user_roles"."user_id" = ( SELECT "auth"."uid"() AS "uid")) AND ("user_roles"."role" = 'super_admin'::"text")))));



CREATE POLICY "super_admins can delete regions" ON "public"."regions" FOR DELETE TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."user_roles"
  WHERE (("user_roles"."user_id" = "auth"."uid"()) AND ("user_roles"."role" = 'super_admin'::"text")))));



CREATE POLICY "super_admins can delete season_podium" ON "public"."season_podium" FOR DELETE TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."user_roles"
  WHERE (("user_roles"."user_id" = ( SELECT "auth"."uid"() AS "uid")) AND ("user_roles"."role" = 'super_admin'::"text")))));



CREATE POLICY "super_admins can delete seasons" ON "public"."seasons" FOR DELETE TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."user_roles"
  WHERE (("user_roles"."user_id" = ( SELECT "auth"."uid"() AS "uid")) AND ("user_roles"."role" = 'super_admin'::"text")))));



CREATE POLICY "super_admins can delete sheet_configs" ON "public"."sheet_configs" FOR DELETE TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."user_roles"
  WHERE (("user_roles"."user_id" = ( SELECT "auth"."uid"() AS "uid")) AND ("user_roles"."role" = 'super_admin'::"text")))));



CREATE POLICY "super_admins can delete team_name_history" ON "public"."team_name_history" FOR DELETE TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."user_roles"
  WHERE (("user_roles"."user_id" = ( SELECT "auth"."uid"() AS "uid")) AND ("user_roles"."role" = 'super_admin'::"text")))));



CREATE POLICY "super_admins can delete teams" ON "public"."teams" FOR DELETE TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."user_roles"
  WHERE (("user_roles"."user_id" = ( SELECT "auth"."uid"() AS "uid")) AND ("user_roles"."role" = 'super_admin'::"text")))));



ALTER TABLE "public"."team_name_history" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."teams" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."user_roles" ENABLE ROW LEVEL SECURITY;




ALTER PUBLICATION "supabase_realtime" OWNER TO "postgres";


GRANT USAGE ON SCHEMA "public" TO "postgres";
GRANT USAGE ON SCHEMA "public" TO "anon";
GRANT USAGE ON SCHEMA "public" TO "authenticated";
GRANT USAGE ON SCHEMA "public" TO "service_role";



GRANT ALL ON FUNCTION "public"."gtrgm_in"("cstring") TO "postgres";
GRANT ALL ON FUNCTION "public"."gtrgm_in"("cstring") TO "anon";
GRANT ALL ON FUNCTION "public"."gtrgm_in"("cstring") TO "authenticated";
GRANT ALL ON FUNCTION "public"."gtrgm_in"("cstring") TO "service_role";



GRANT ALL ON FUNCTION "public"."gtrgm_out"("public"."gtrgm") TO "postgres";
GRANT ALL ON FUNCTION "public"."gtrgm_out"("public"."gtrgm") TO "anon";
GRANT ALL ON FUNCTION "public"."gtrgm_out"("public"."gtrgm") TO "authenticated";
GRANT ALL ON FUNCTION "public"."gtrgm_out"("public"."gtrgm") TO "service_role";








































































































































































GRANT ALL ON FUNCTION "public"."advance_playoff_winner"("p_match_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."advance_playoff_winner"("p_match_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."advance_playoff_winner"("p_match_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."bump_cache_version"("p_tag" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."bump_cache_version"("p_tag" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."bump_cache_version"("p_tag" "text") TO "service_role";



GRANT ALL ON TABLE "public"."matches" TO "anon";
GRANT ALL ON TABLE "public"."matches" TO "authenticated";
GRANT ALL ON TABLE "public"."matches" TO "service_role";



GRANT ALL ON FUNCTION "public"."complete_match"("p_match_id" "uuid", "p_sets" "jsonb", "p_home_sets_won" integer, "p_away_sets_won" integer, "p_home_lvr" numeric, "p_away_lvr" numeric, "p_home_points" numeric, "p_away_points" numeric, "p_home_bonus" numeric, "p_away_bonus" numeric, "p_point_diff" numeric, "p_mvp_player_id" "uuid", "p_loser_mvp_player_id" "uuid", "p_is_forfeit" boolean, "p_scheduled_at" timestamp with time zone) TO "anon";
GRANT ALL ON FUNCTION "public"."complete_match"("p_match_id" "uuid", "p_sets" "jsonb", "p_home_sets_won" integer, "p_away_sets_won" integer, "p_home_lvr" numeric, "p_away_lvr" numeric, "p_home_points" numeric, "p_away_points" numeric, "p_home_bonus" numeric, "p_away_bonus" numeric, "p_point_diff" numeric, "p_mvp_player_id" "uuid", "p_loser_mvp_player_id" "uuid", "p_is_forfeit" boolean, "p_scheduled_at" timestamp with time zone) TO "authenticated";
GRANT ALL ON FUNCTION "public"."complete_match"("p_match_id" "uuid", "p_sets" "jsonb", "p_home_sets_won" integer, "p_away_sets_won" integer, "p_home_lvr" numeric, "p_away_lvr" numeric, "p_home_points" numeric, "p_away_points" numeric, "p_home_bonus" numeric, "p_away_bonus" numeric, "p_point_diff" numeric, "p_mvp_player_id" "uuid", "p_loser_mvp_player_id" "uuid", "p_is_forfeit" boolean, "p_scheduled_at" timestamp with time zone) TO "service_role";



GRANT ALL ON FUNCTION "public"."get_player_raw_stat_totals"("p_roblox_user_id" "text", "p_season_number" integer) TO "anon";
GRANT ALL ON FUNCTION "public"."get_player_raw_stat_totals"("p_roblox_user_id" "text", "p_season_number" integer) TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_player_raw_stat_totals"("p_roblox_user_id" "text", "p_season_number" integer) TO "service_role";



GRANT ALL ON FUNCTION "public"."get_player_season_stats_ranged"("p_season_id" "uuid", "p_from" timestamp with time zone, "p_to" timestamp with time zone) TO "anon";
GRANT ALL ON FUNCTION "public"."get_player_season_stats_ranged"("p_season_id" "uuid", "p_from" timestamp with time zone, "p_to" timestamp with time zone) TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_player_season_stats_ranged"("p_season_id" "uuid", "p_from" timestamp with time zone, "p_to" timestamp with time zone) TO "service_role";



GRANT ALL ON FUNCTION "public"."get_player_season_stats_scoped"("p_season_id" "uuid", "p_from" timestamp with time zone, "p_to" timestamp with time zone, "p_position" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."get_player_season_stats_scoped"("p_season_id" "uuid", "p_from" timestamp with time zone, "p_to" timestamp with time zone, "p_position" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_player_season_stats_scoped"("p_season_id" "uuid", "p_from" timestamp with time zone, "p_to" timestamp with time zone, "p_position" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."get_player_stat_ranks"("p_roblox_user_id" "text", "p_season_number" integer) TO "anon";
GRANT ALL ON FUNCTION "public"."get_player_stat_ranks"("p_roblox_user_id" "text", "p_season_number" integer) TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_player_stat_ranks"("p_roblox_user_id" "text", "p_season_number" integer) TO "service_role";



GRANT ALL ON FUNCTION "public"."get_raw_stat_summary"("p_season_number" integer) TO "anon";
GRANT ALL ON FUNCTION "public"."get_raw_stat_summary"("p_season_number" integer) TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_raw_stat_summary"("p_season_number" integer) TO "service_role";



GRANT ALL ON FUNCTION "public"."get_user_role"("check_user_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."get_user_role"("check_user_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_user_role"("check_user_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."gin_extract_query_trgm"("text", "internal", smallint, "internal", "internal", "internal", "internal") TO "postgres";
GRANT ALL ON FUNCTION "public"."gin_extract_query_trgm"("text", "internal", smallint, "internal", "internal", "internal", "internal") TO "anon";
GRANT ALL ON FUNCTION "public"."gin_extract_query_trgm"("text", "internal", smallint, "internal", "internal", "internal", "internal") TO "authenticated";
GRANT ALL ON FUNCTION "public"."gin_extract_query_trgm"("text", "internal", smallint, "internal", "internal", "internal", "internal") TO "service_role";



GRANT ALL ON FUNCTION "public"."gin_extract_value_trgm"("text", "internal") TO "postgres";
GRANT ALL ON FUNCTION "public"."gin_extract_value_trgm"("text", "internal") TO "anon";
GRANT ALL ON FUNCTION "public"."gin_extract_value_trgm"("text", "internal") TO "authenticated";
GRANT ALL ON FUNCTION "public"."gin_extract_value_trgm"("text", "internal") TO "service_role";



GRANT ALL ON FUNCTION "public"."gin_trgm_consistent"("internal", smallint, "text", integer, "internal", "internal", "internal", "internal") TO "postgres";
GRANT ALL ON FUNCTION "public"."gin_trgm_consistent"("internal", smallint, "text", integer, "internal", "internal", "internal", "internal") TO "anon";
GRANT ALL ON FUNCTION "public"."gin_trgm_consistent"("internal", smallint, "text", integer, "internal", "internal", "internal", "internal") TO "authenticated";
GRANT ALL ON FUNCTION "public"."gin_trgm_consistent"("internal", smallint, "text", integer, "internal", "internal", "internal", "internal") TO "service_role";



GRANT ALL ON FUNCTION "public"."gin_trgm_triconsistent"("internal", smallint, "text", integer, "internal", "internal", "internal") TO "postgres";
GRANT ALL ON FUNCTION "public"."gin_trgm_triconsistent"("internal", smallint, "text", integer, "internal", "internal", "internal") TO "anon";
GRANT ALL ON FUNCTION "public"."gin_trgm_triconsistent"("internal", smallint, "text", integer, "internal", "internal", "internal") TO "authenticated";
GRANT ALL ON FUNCTION "public"."gin_trgm_triconsistent"("internal", smallint, "text", integer, "internal", "internal", "internal") TO "service_role";



GRANT ALL ON FUNCTION "public"."gtrgm_compress"("internal") TO "postgres";
GRANT ALL ON FUNCTION "public"."gtrgm_compress"("internal") TO "anon";
GRANT ALL ON FUNCTION "public"."gtrgm_compress"("internal") TO "authenticated";
GRANT ALL ON FUNCTION "public"."gtrgm_compress"("internal") TO "service_role";



GRANT ALL ON FUNCTION "public"."gtrgm_consistent"("internal", "text", smallint, "oid", "internal") TO "postgres";
GRANT ALL ON FUNCTION "public"."gtrgm_consistent"("internal", "text", smallint, "oid", "internal") TO "anon";
GRANT ALL ON FUNCTION "public"."gtrgm_consistent"("internal", "text", smallint, "oid", "internal") TO "authenticated";
GRANT ALL ON FUNCTION "public"."gtrgm_consistent"("internal", "text", smallint, "oid", "internal") TO "service_role";



GRANT ALL ON FUNCTION "public"."gtrgm_decompress"("internal") TO "postgres";
GRANT ALL ON FUNCTION "public"."gtrgm_decompress"("internal") TO "anon";
GRANT ALL ON FUNCTION "public"."gtrgm_decompress"("internal") TO "authenticated";
GRANT ALL ON FUNCTION "public"."gtrgm_decompress"("internal") TO "service_role";



GRANT ALL ON FUNCTION "public"."gtrgm_distance"("internal", "text", smallint, "oid", "internal") TO "postgres";
GRANT ALL ON FUNCTION "public"."gtrgm_distance"("internal", "text", smallint, "oid", "internal") TO "anon";
GRANT ALL ON FUNCTION "public"."gtrgm_distance"("internal", "text", smallint, "oid", "internal") TO "authenticated";
GRANT ALL ON FUNCTION "public"."gtrgm_distance"("internal", "text", smallint, "oid", "internal") TO "service_role";



GRANT ALL ON FUNCTION "public"."gtrgm_options"("internal") TO "postgres";
GRANT ALL ON FUNCTION "public"."gtrgm_options"("internal") TO "anon";
GRANT ALL ON FUNCTION "public"."gtrgm_options"("internal") TO "authenticated";
GRANT ALL ON FUNCTION "public"."gtrgm_options"("internal") TO "service_role";



GRANT ALL ON FUNCTION "public"."gtrgm_penalty"("internal", "internal", "internal") TO "postgres";
GRANT ALL ON FUNCTION "public"."gtrgm_penalty"("internal", "internal", "internal") TO "anon";
GRANT ALL ON FUNCTION "public"."gtrgm_penalty"("internal", "internal", "internal") TO "authenticated";
GRANT ALL ON FUNCTION "public"."gtrgm_penalty"("internal", "internal", "internal") TO "service_role";



GRANT ALL ON FUNCTION "public"."gtrgm_picksplit"("internal", "internal") TO "postgres";
GRANT ALL ON FUNCTION "public"."gtrgm_picksplit"("internal", "internal") TO "anon";
GRANT ALL ON FUNCTION "public"."gtrgm_picksplit"("internal", "internal") TO "authenticated";
GRANT ALL ON FUNCTION "public"."gtrgm_picksplit"("internal", "internal") TO "service_role";



GRANT ALL ON FUNCTION "public"."gtrgm_same"("public"."gtrgm", "public"."gtrgm", "internal") TO "postgres";
GRANT ALL ON FUNCTION "public"."gtrgm_same"("public"."gtrgm", "public"."gtrgm", "internal") TO "anon";
GRANT ALL ON FUNCTION "public"."gtrgm_same"("public"."gtrgm", "public"."gtrgm", "internal") TO "authenticated";
GRANT ALL ON FUNCTION "public"."gtrgm_same"("public"."gtrgm", "public"."gtrgm", "internal") TO "service_role";



GRANT ALL ON FUNCTION "public"."gtrgm_union"("internal", "internal") TO "postgres";
GRANT ALL ON FUNCTION "public"."gtrgm_union"("internal", "internal") TO "anon";
GRANT ALL ON FUNCTION "public"."gtrgm_union"("internal", "internal") TO "authenticated";
GRANT ALL ON FUNCTION "public"."gtrgm_union"("internal", "internal") TO "service_role";



GRANT ALL ON FUNCTION "public"."has_role"("check_user_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."has_role"("check_user_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."has_role"("check_user_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."readvance_playoff_match"("p_match_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."readvance_playoff_match"("p_match_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."readvance_playoff_match"("p_match_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."reapply_match_result"("p_match_id" "uuid", "p_sets" "jsonb", "p_home_sets_won" integer, "p_away_sets_won" integer, "p_home_lvr" numeric, "p_away_lvr" numeric, "p_home_points" numeric, "p_away_points" numeric, "p_home_bonus" numeric, "p_away_bonus" numeric, "p_point_diff" numeric, "p_mvp_player_id" "uuid", "p_loser_mvp_player_id" "uuid", "p_is_forfeit" boolean) TO "anon";
GRANT ALL ON FUNCTION "public"."reapply_match_result"("p_match_id" "uuid", "p_sets" "jsonb", "p_home_sets_won" integer, "p_away_sets_won" integer, "p_home_lvr" numeric, "p_away_lvr" numeric, "p_home_points" numeric, "p_away_points" numeric, "p_home_bonus" numeric, "p_away_bonus" numeric, "p_point_diff" numeric, "p_mvp_player_id" "uuid", "p_loser_mvp_player_id" "uuid", "p_is_forfeit" boolean) TO "authenticated";
GRANT ALL ON FUNCTION "public"."reapply_match_result"("p_match_id" "uuid", "p_sets" "jsonb", "p_home_sets_won" integer, "p_away_sets_won" integer, "p_home_lvr" numeric, "p_away_lvr" numeric, "p_home_points" numeric, "p_away_points" numeric, "p_home_bonus" numeric, "p_away_bonus" numeric, "p_point_diff" numeric, "p_mvp_player_id" "uuid", "p_loser_mvp_player_id" "uuid", "p_is_forfeit" boolean) TO "service_role";



GRANT ALL ON FUNCTION "public"."replace_match_player_stats"("p_match_id" "uuid", "p_rows" "jsonb") TO "anon";
GRANT ALL ON FUNCTION "public"."replace_match_player_stats"("p_match_id" "uuid", "p_rows" "jsonb") TO "authenticated";
GRANT ALL ON FUNCTION "public"."replace_match_player_stats"("p_match_id" "uuid", "p_rows" "jsonb") TO "service_role";



GRANT ALL ON FUNCTION "public"."search_players_with_similarity"("search_term" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."search_players_with_similarity"("search_term" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."search_players_with_similarity"("search_term" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."set_limit"(real) TO "postgres";
GRANT ALL ON FUNCTION "public"."set_limit"(real) TO "anon";
GRANT ALL ON FUNCTION "public"."set_limit"(real) TO "authenticated";
GRANT ALL ON FUNCTION "public"."set_limit"(real) TO "service_role";



GRANT ALL ON FUNCTION "public"."show_limit"() TO "postgres";
GRANT ALL ON FUNCTION "public"."show_limit"() TO "anon";
GRANT ALL ON FUNCTION "public"."show_limit"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."show_limit"() TO "service_role";



GRANT ALL ON FUNCTION "public"."show_trgm"("text") TO "postgres";
GRANT ALL ON FUNCTION "public"."show_trgm"("text") TO "anon";
GRANT ALL ON FUNCTION "public"."show_trgm"("text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."show_trgm"("text") TO "service_role";



GRANT ALL ON FUNCTION "public"."similarity"("text", "text") TO "postgres";
GRANT ALL ON FUNCTION "public"."similarity"("text", "text") TO "anon";
GRANT ALL ON FUNCTION "public"."similarity"("text", "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."similarity"("text", "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."similarity_dist"("text", "text") TO "postgres";
GRANT ALL ON FUNCTION "public"."similarity_dist"("text", "text") TO "anon";
GRANT ALL ON FUNCTION "public"."similarity_dist"("text", "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."similarity_dist"("text", "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."similarity_op"("text", "text") TO "postgres";
GRANT ALL ON FUNCTION "public"."similarity_op"("text", "text") TO "anon";
GRANT ALL ON FUNCTION "public"."similarity_op"("text", "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."similarity_op"("text", "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."strict_word_similarity"("text", "text") TO "postgres";
GRANT ALL ON FUNCTION "public"."strict_word_similarity"("text", "text") TO "anon";
GRANT ALL ON FUNCTION "public"."strict_word_similarity"("text", "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."strict_word_similarity"("text", "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."strict_word_similarity_commutator_op"("text", "text") TO "postgres";
GRANT ALL ON FUNCTION "public"."strict_word_similarity_commutator_op"("text", "text") TO "anon";
GRANT ALL ON FUNCTION "public"."strict_word_similarity_commutator_op"("text", "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."strict_word_similarity_commutator_op"("text", "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."strict_word_similarity_dist_commutator_op"("text", "text") TO "postgres";
GRANT ALL ON FUNCTION "public"."strict_word_similarity_dist_commutator_op"("text", "text") TO "anon";
GRANT ALL ON FUNCTION "public"."strict_word_similarity_dist_commutator_op"("text", "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."strict_word_similarity_dist_commutator_op"("text", "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."strict_word_similarity_dist_op"("text", "text") TO "postgres";
GRANT ALL ON FUNCTION "public"."strict_word_similarity_dist_op"("text", "text") TO "anon";
GRANT ALL ON FUNCTION "public"."strict_word_similarity_dist_op"("text", "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."strict_word_similarity_dist_op"("text", "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."strict_word_similarity_op"("text", "text") TO "postgres";
GRANT ALL ON FUNCTION "public"."strict_word_similarity_op"("text", "text") TO "anon";
GRANT ALL ON FUNCTION "public"."strict_word_similarity_op"("text", "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."strict_word_similarity_op"("text", "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."update_officials_updated_at"() TO "anon";
GRANT ALL ON FUNCTION "public"."update_officials_updated_at"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."update_officials_updated_at"() TO "service_role";



GRANT ALL ON FUNCTION "public"."void_match"("p_match_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."void_match"("p_match_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."void_match"("p_match_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."word_similarity"("text", "text") TO "postgres";
GRANT ALL ON FUNCTION "public"."word_similarity"("text", "text") TO "anon";
GRANT ALL ON FUNCTION "public"."word_similarity"("text", "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."word_similarity"("text", "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."word_similarity_commutator_op"("text", "text") TO "postgres";
GRANT ALL ON FUNCTION "public"."word_similarity_commutator_op"("text", "text") TO "anon";
GRANT ALL ON FUNCTION "public"."word_similarity_commutator_op"("text", "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."word_similarity_commutator_op"("text", "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."word_similarity_dist_commutator_op"("text", "text") TO "postgres";
GRANT ALL ON FUNCTION "public"."word_similarity_dist_commutator_op"("text", "text") TO "anon";
GRANT ALL ON FUNCTION "public"."word_similarity_dist_commutator_op"("text", "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."word_similarity_dist_commutator_op"("text", "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."word_similarity_dist_op"("text", "text") TO "postgres";
GRANT ALL ON FUNCTION "public"."word_similarity_dist_op"("text", "text") TO "anon";
GRANT ALL ON FUNCTION "public"."word_similarity_dist_op"("text", "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."word_similarity_dist_op"("text", "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."word_similarity_op"("text", "text") TO "postgres";
GRANT ALL ON FUNCTION "public"."word_similarity_op"("text", "text") TO "anon";
GRANT ALL ON FUNCTION "public"."word_similarity_op"("text", "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."word_similarity_op"("text", "text") TO "service_role";





















GRANT ALL ON TABLE "public"."article_media" TO "anon";
GRANT ALL ON TABLE "public"."article_media" TO "authenticated";
GRANT ALL ON TABLE "public"."article_media" TO "service_role";



GRANT ALL ON TABLE "public"."articles" TO "anon";
GRANT ALL ON TABLE "public"."articles" TO "authenticated";
GRANT ALL ON TABLE "public"."articles" TO "service_role";



GRANT ALL ON TABLE "public"."cache_versions" TO "anon";
GRANT ALL ON TABLE "public"."cache_versions" TO "authenticated";
GRANT ALL ON TABLE "public"."cache_versions" TO "service_role";



GRANT ALL ON TABLE "public"."match_officials" TO "anon";
GRANT ALL ON TABLE "public"."match_officials" TO "authenticated";
GRANT ALL ON TABLE "public"."match_officials" TO "service_role";



GRANT ALL ON TABLE "public"."match_sets" TO "anon";
GRANT ALL ON TABLE "public"."match_sets" TO "authenticated";
GRANT ALL ON TABLE "public"."match_sets" TO "service_role";



GRANT ALL ON TABLE "public"."match_sheet_config" TO "anon";
GRANT ALL ON TABLE "public"."match_sheet_config" TO "authenticated";
GRANT ALL ON TABLE "public"."match_sheet_config" TO "service_role";



GRANT ALL ON TABLE "public"."media_posts" TO "anon";
GRANT ALL ON TABLE "public"."media_posts" TO "authenticated";
GRANT ALL ON TABLE "public"."media_posts" TO "service_role";



GRANT ALL ON TABLE "public"."pending_users" TO "anon";
GRANT ALL ON TABLE "public"."pending_users" TO "authenticated";
GRANT ALL ON TABLE "public"."pending_users" TO "service_role";



GRANT ALL ON TABLE "public"."player_match_stats" TO "anon";
GRANT ALL ON TABLE "public"."player_match_stats" TO "authenticated";
GRANT ALL ON TABLE "public"."player_match_stats" TO "service_role";



GRANT ALL ON TABLE "public"."player_team_seasons" TO "anon";
GRANT ALL ON TABLE "public"."player_team_seasons" TO "authenticated";
GRANT ALL ON TABLE "public"."player_team_seasons" TO "service_role";



GRANT ALL ON TABLE "public"."players" TO "anon";
GRANT ALL ON TABLE "public"."players" TO "authenticated";
GRANT ALL ON TABLE "public"."players" TO "service_role";



GRANT ALL ON TABLE "public"."playoff_brackets" TO "anon";
GRANT ALL ON TABLE "public"."playoff_brackets" TO "authenticated";
GRANT ALL ON TABLE "public"."playoff_brackets" TO "service_role";



GRANT ALL ON TABLE "public"."playoff_configs" TO "anon";
GRANT ALL ON TABLE "public"."playoff_configs" TO "authenticated";
GRANT ALL ON TABLE "public"."playoff_configs" TO "service_role";



GRANT ALL ON TABLE "public"."public_spec_snapshot" TO "anon";
GRANT ALL ON TABLE "public"."public_spec_snapshot" TO "authenticated";
GRANT ALL ON TABLE "public"."public_spec_snapshot" TO "service_role";



GRANT ALL ON TABLE "public"."regions" TO "anon";
GRANT ALL ON TABLE "public"."regions" TO "authenticated";
GRANT ALL ON TABLE "public"."regions" TO "service_role";



GRANT ALL ON TABLE "public"."season_awards" TO "anon";
GRANT ALL ON TABLE "public"."season_awards" TO "authenticated";
GRANT ALL ON TABLE "public"."season_awards" TO "service_role";



GRANT ALL ON TABLE "public"."season_podium" TO "anon";
GRANT ALL ON TABLE "public"."season_podium" TO "authenticated";
GRANT ALL ON TABLE "public"."season_podium" TO "service_role";



GRANT ALL ON TABLE "public"."seasons" TO "anon";
GRANT ALL ON TABLE "public"."seasons" TO "authenticated";
GRANT ALL ON TABLE "public"."seasons" TO "service_role";



GRANT ALL ON TABLE "public"."sheet_configs" TO "anon";
GRANT ALL ON TABLE "public"."sheet_configs" TO "authenticated";
GRANT ALL ON TABLE "public"."sheet_configs" TO "service_role";



GRANT ALL ON TABLE "public"."sheet_sync_logs" TO "anon";
GRANT ALL ON TABLE "public"."sheet_sync_logs" TO "authenticated";
GRANT ALL ON TABLE "public"."sheet_sync_logs" TO "service_role";



GRANT ALL ON TABLE "public"."spec_bonuses" TO "anon";
GRANT ALL ON TABLE "public"."spec_bonuses" TO "authenticated";
GRANT ALL ON TABLE "public"."spec_bonuses" TO "service_role";



GRANT ALL ON TABLE "public"."spec_requirements" TO "anon";
GRANT ALL ON TABLE "public"."spec_requirements" TO "authenticated";
GRANT ALL ON TABLE "public"."spec_requirements" TO "service_role";



GRANT ALL ON TABLE "public"."spec_winners" TO "anon";
GRANT ALL ON TABLE "public"."spec_winners" TO "authenticated";
GRANT ALL ON TABLE "public"."spec_winners" TO "service_role";



GRANT ALL ON TABLE "public"."specs" TO "anon";
GRANT ALL ON TABLE "public"."specs" TO "authenticated";
GRANT ALL ON TABLE "public"."specs" TO "service_role";



GRANT ALL ON TABLE "public"."teams" TO "anon";
GRANT ALL ON TABLE "public"."teams" TO "authenticated";
GRANT ALL ON TABLE "public"."teams" TO "service_role";



GRANT ALL ON TABLE "public"."standings" TO "anon";
GRANT ALL ON TABLE "public"."standings" TO "authenticated";
GRANT ALL ON TABLE "public"."standings" TO "service_role";



GRANT ALL ON TABLE "public"."team_name_history" TO "anon";
GRANT ALL ON TABLE "public"."team_name_history" TO "authenticated";
GRANT ALL ON TABLE "public"."team_name_history" TO "service_role";



GRANT ALL ON TABLE "public"."user_roles" TO "anon";
GRANT ALL ON TABLE "public"."user_roles" TO "authenticated";
GRANT ALL ON TABLE "public"."user_roles" TO "service_role";



GRANT ALL ON TABLE "public"."v_player_season_stats" TO "anon";
GRANT ALL ON TABLE "public"."v_player_season_stats" TO "authenticated";
GRANT ALL ON TABLE "public"."v_player_season_stats" TO "service_role";



GRANT ALL ON TABLE "public"."v_leaderboard_identity" TO "anon";
GRANT ALL ON TABLE "public"."v_leaderboard_identity" TO "authenticated";
GRANT ALL ON TABLE "public"."v_leaderboard_identity" TO "service_role";



GRANT ALL ON TABLE "public"."v_matches_with_stats" TO "anon";
GRANT ALL ON TABLE "public"."v_matches_with_stats" TO "authenticated";
GRANT ALL ON TABLE "public"."v_matches_with_stats" TO "service_role";



GRANT ALL ON TABLE "public"."v_player_leaderboard" TO "anon";
GRANT ALL ON TABLE "public"."v_player_leaderboard" TO "authenticated";
GRANT ALL ON TABLE "public"."v_player_leaderboard" TO "service_role";



GRANT ALL ON TABLE "public"."v_player_match_stat_sets" TO "anon";
GRANT ALL ON TABLE "public"."v_player_match_stat_sets" TO "authenticated";
GRANT ALL ON TABLE "public"."v_player_match_stat_sets" TO "service_role";



GRANT ALL ON TABLE "public"."v_player_match_stat_totals" TO "anon";
GRANT ALL ON TABLE "public"."v_player_match_stat_totals" TO "authenticated";
GRANT ALL ON TABLE "public"."v_player_match_stat_totals" TO "service_role";









ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "service_role";






ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "service_role";






ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "service_role";































