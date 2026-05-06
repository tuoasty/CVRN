


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


CREATE OR REPLACE FUNCTION "public"."add_to_pending_users"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
BEGIN
  INSERT INTO public.pending_users (user_id, email)
  VALUES (NEW.id, NEW.email)
  ON CONFLICT (user_id) DO NOTHING;
  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."add_to_pending_users"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."assign_role_from_invite"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
DECLARE
  invited_role TEXT;
BEGIN
  SELECT role
  INTO invited_role
  FROM public.pending_users
  WHERE lower(email) = lower(NEW.email)
    AND accepted = FALSE
    AND expires_at > now();

  IF invited_role IS NOT NULL THEN
    INSERT INTO public.user_roles (
      user_id,
      email,
      role,
      created_at
    )
    VALUES (
      NEW.id,
      NEW.email,
      invited_role,
      now()
    );

    UPDATE public.pending_users
    SET accepted = TRUE
    WHERE lower(email) = lower(NEW.email);
  END IF;

  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."assign_role_from_invite"() OWNER TO "postgres";


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


CREATE OR REPLACE FUNCTION "public"."search_officials_with_similarity"("search_term" "text") RETURNS TABLE("id" "uuid", "roblox_user_id" "text", "username" "text", "display_name" "text", "avatar_url" "text", "similarity_score" real)
    LANGUAGE "plpgsql"
    AS $$
BEGIN
    SET pg_trgm.similarity_threshold = 0.1;
    
    RETURN QUERY
    SELECT 
        o.id,
        o.roblox_user_id::TEXT,
        o.username,
        o.display_name,
        o.avatar_url,
        GREATEST(
            COALESCE(similarity(LOWER(o.username), search_term), 0),
            COALESCE(similarity(LOWER(o.display_name), search_term), 0)
        ) AS similarity_score
    FROM officials o
    WHERE 
        LOWER(o.username) % search_term 
        OR LOWER(o.display_name) % search_term
        OR LOWER(o.username) ILIKE '%' || search_term || '%'
        OR LOWER(o.display_name) ILIKE '%' || search_term || '%'
    ORDER BY similarity_score DESC
    LIMIT 20;
END;
$$;


ALTER FUNCTION "public"."search_officials_with_similarity"("search_term" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."search_players_with_similarity"("search_term" "text") RETURNS TABLE("id" "uuid", "roblox_user_id" "text", "username" "text", "display_name" "text", "avatar_url" "text", "similarity_score" real)
    LANGUAGE "plpgsql"
    AS $$
BEGIN
    SET pg_trgm.similarity_threshold = 0.1;
    
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

SET default_tablespace = '';

SET default_table_access_method = "heap";


CREATE TABLE IF NOT EXISTS "public"."match_officials" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "match_id" "uuid" NOT NULL,
    "official_id" "uuid" NOT NULL,
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
    CONSTRAINT "chk_different_teams" CHECK (("home_team_id" <> "away_team_id")),
    CONSTRAINT "matches_best_of_check" CHECK (("best_of" = ANY (ARRAY[3, 5])))
);


ALTER TABLE "public"."matches" OWNER TO "postgres";


COMMENT ON COLUMN "public"."matches"."match_mvp_player_id" IS 'Player awarded MVP for the winning team';



COMMENT ON COLUMN "public"."matches"."loser_mvp_player_id" IS 'Player awarded MVP for the losing team';



CREATE TABLE IF NOT EXISTS "public"."officials" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "roblox_user_id" bigint NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    "username" "text",
    "avatar_url" "text",
    "last_synced_at" timestamp with time zone,
    "display_name" "text"
);


ALTER TABLE "public"."officials" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."pending_users" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "email" "text" NOT NULL,
    "requested_at" timestamp with time zone,
    "notes" "text",
    "role" "text" NOT NULL,
    "invited_by" "uuid",
    "accepted" boolean DEFAULT false,
    "expires_at" timestamp with time zone DEFAULT ("now"() + '7 days'::interval),
    CONSTRAINT "pending_users_role_check" CHECK (("role" = ANY (ARRAY['user'::"text", 'admin'::"text", 'super_admin'::"text", 'stat_tracker'::"text"])))
);


ALTER TABLE "public"."pending_users" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."player_stats" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "match_id" "uuid" NOT NULL,
    "player_id" "uuid" NOT NULL,
    "team_id" "uuid" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."player_stats" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."player_team_seasons" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "player_id" "uuid" NOT NULL,
    "team_id" "uuid" NOT NULL,
    "season_id" "uuid" NOT NULL,
    "joined_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "left_at" timestamp with time zone,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "role" "text" DEFAULT 'player'::"text",
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
    "position" "text",
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
    CONSTRAINT "playoff_brackets_loser_position_check" CHECK (("loser_position" = ANY (ARRAY['home'::"text", 'away'::"text"]))),
    CONSTRAINT "playoff_brackets_round_check" CHECK (("round" = ANY (ARRAY['play_in'::"text", 'round_of_16'::"text", 'quarterfinal'::"text", 'semifinal'::"text", 'final'::"text", 'third_place'::"text"]))),
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
    CONSTRAINT "playoff_configs_elimination_type_check" CHECK (("elimination_type" = ANY (ARRAY['single'::"text", 'double'::"text"]))),
    CONSTRAINT "playoff_configs_playin_teams_check" CHECK (("playin_teams" >= 0)),
    CONSTRAINT "playoff_configs_qualified_teams_check" CHECK (("qualified_teams" >= 0))
);


ALTER TABLE "public"."playoff_configs" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."regions" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "code" "text" NOT NULL,
    "name" "text" NOT NULL
);


ALTER TABLE "public"."regions" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."seasons" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "region_id" "uuid" NOT NULL,
    "name" "text" NOT NULL,
    "slug" "text" NOT NULL,
    "theme" "text",
    "start_date" timestamp with time zone NOT NULL,
    "end_date" timestamp with time zone,
    "is_active" boolean DEFAULT false NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "playoff_config_id" "uuid",
    "playoff_started" boolean DEFAULT false NOT NULL,
    "playoff_completed" boolean DEFAULT false NOT NULL,
    "weeks" integer DEFAULT 5
);


ALTER TABLE "public"."seasons" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."teams" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "season_id" "uuid" NOT NULL,
    "name" "text" NOT NULL,
    "slug" "text" NOT NULL,
    "logo_url" "text",
    "brick_number" integer NOT NULL,
    "brick_color" "text" NOT NULL,
    "previous_team_id" "uuid",
    "deleted_at" timestamp with time zone,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "starting_lvr" numeric DEFAULT 100 NOT NULL,
    "is_bye" boolean DEFAULT false NOT NULL
);


ALTER TABLE "public"."teams" OWNER TO "postgres";


CREATE OR REPLACE VIEW "public"."standings" AS
 SELECT "s"."id" AS "season_id",
    "s"."region_id",
    "t"."id" AS "team_id",
    "t"."name" AS "team_name",
    "t"."slug" AS "team_slug",
    "t"."logo_url" AS "team_logo_url",
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
    "row_number"() OVER (PARTITION BY "s"."id" ORDER BY ("t"."starting_lvr" + COALESCE("sum"(
        CASE
            WHEN ("m"."home_team_id" = "t"."id") THEN "m"."home_team_lvr"
            WHEN ("m"."away_team_id" = "t"."id") THEN "m"."away_team_lvr"
            ELSE NULL::numeric
        END), (0)::numeric)) DESC, ("count"(
        CASE
            WHEN ((("m"."home_team_id" = "t"."id") AND ("m"."home_sets_won" > "m"."away_sets_won")) OR (("m"."away_team_id" = "t"."id") AND ("m"."away_sets_won" > "m"."home_sets_won"))) THEN 1
            ELSE NULL::integer
        END)) DESC) AS "rank"
   FROM (("public"."teams" "t"
     JOIN "public"."seasons" "s" ON (("t"."season_id" = "s"."id")))
     LEFT JOIN "public"."matches" "m" ON (((("m"."home_team_id" = "t"."id") OR ("m"."away_team_id" = "t"."id")) AND ("m"."status" = 'completed'::"public"."match_status") AND ("m"."match_type" = 'season'::"public"."match_type"))))
  WHERE (("t"."deleted_at" IS NULL) AND ("t"."is_bye" = false))
  GROUP BY "s"."id", "s"."region_id", "t"."id", "t"."name", "t"."slug", "t"."logo_url", "t"."starting_lvr";


ALTER VIEW "public"."standings" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."user_roles" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "role" "text",
    "promoted_by" "uuid",
    "promoted_at" timestamp with time zone DEFAULT "now"(),
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone,
    CONSTRAINT "user_roles_role_check" CHECK (("role" = ANY (ARRAY['super_admin'::"text", 'admin'::"text", 'stat_tracker'::"text"])))
);


ALTER TABLE "public"."user_roles" OWNER TO "postgres";


ALTER TABLE ONLY "public"."match_officials"
    ADD CONSTRAINT "match_officials_match_id_official_id_official_type_key" UNIQUE ("match_id", "official_id", "official_type");



ALTER TABLE ONLY "public"."match_officials"
    ADD CONSTRAINT "match_officials_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."match_sets"
    ADD CONSTRAINT "match_sets_match_id_set_number_key" UNIQUE ("match_id", "set_number");



ALTER TABLE ONLY "public"."match_sets"
    ADD CONSTRAINT "match_sets_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."matches"
    ADD CONSTRAINT "matches_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."officials"
    ADD CONSTRAINT "officials_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."officials"
    ADD CONSTRAINT "officials_roblox_user_id_key" UNIQUE ("roblox_user_id");



ALTER TABLE ONLY "public"."pending_users"
    ADD CONSTRAINT "pending_users_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."player_stats"
    ADD CONSTRAINT "player_stats_match_id_player_id_key" UNIQUE ("match_id", "player_id");



ALTER TABLE ONLY "public"."player_stats"
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



ALTER TABLE ONLY "public"."regions"
    ADD CONSTRAINT "regions_code_key" UNIQUE ("code");



ALTER TABLE ONLY "public"."regions"
    ADD CONSTRAINT "regions_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."seasons"
    ADD CONSTRAINT "seasons_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."seasons"
    ADD CONSTRAINT "seasons_slug_region_id_key" UNIQUE ("slug", "region_id");



ALTER TABLE ONLY "public"."teams"
    ADD CONSTRAINT "teams_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."user_roles"
    ADD CONSTRAINT "user_roles_pkey" PRIMARY KEY ("id");



CREATE INDEX "idx_match_officials_match_id" ON "public"."match_officials" USING "btree" ("match_id");



CREATE INDEX "idx_match_officials_official_id" ON "public"."match_officials" USING "btree" ("official_id");



CREATE INDEX "idx_match_sets_match_id" ON "public"."match_sets" USING "btree" ("match_id");



CREATE INDEX "idx_matches_away_team_id" ON "public"."matches" USING "btree" ("away_team_id");



CREATE INDEX "idx_matches_home_team_id" ON "public"."matches" USING "btree" ("home_team_id");



CREATE INDEX "idx_matches_loser_mvp_player_id" ON "public"."matches" USING "btree" ("loser_mvp_player_id") WHERE ("loser_mvp_player_id" IS NOT NULL);



CREATE INDEX "idx_matches_match_mvp_player_id" ON "public"."matches" USING "btree" ("match_mvp_player_id") WHERE ("match_mvp_player_id" IS NOT NULL);



CREATE INDEX "idx_matches_scheduled_at" ON "public"."matches" USING "btree" ("scheduled_at");



CREATE INDEX "idx_matches_season_id" ON "public"."matches" USING "btree" ("season_id");



CREATE INDEX "idx_matches_status" ON "public"."matches" USING "btree" ("status");



CREATE INDEX "idx_matches_week" ON "public"."matches" USING "btree" ("week");



CREATE INDEX "idx_officials_roblox_user_id" ON "public"."officials" USING "btree" ("roblox_user_id");



CREATE INDEX "idx_officials_username" ON "public"."officials" USING "btree" ("username");



CREATE UNIQUE INDEX "idx_one_captain_per_team_season" ON "public"."player_team_seasons" USING "btree" ("team_id", "season_id", "role") WHERE (("role" = 'captain'::"text") AND ("left_at" IS NULL));



CREATE UNIQUE INDEX "idx_one_court_captain_per_team_season" ON "public"."player_team_seasons" USING "btree" ("team_id", "season_id", "role") WHERE (("role" = 'court_captain'::"text") AND ("left_at" IS NULL));



CREATE UNIQUE INDEX "idx_one_vice_captain_per_team_season" ON "public"."player_team_seasons" USING "btree" ("team_id", "season_id", "role") WHERE (("role" = 'vice_captain'::"text") AND ("left_at" IS NULL));



CREATE INDEX "idx_player_stats_match_id" ON "public"."player_stats" USING "btree" ("match_id");



CREATE INDEX "idx_player_stats_player_id" ON "public"."player_stats" USING "btree" ("player_id");



CREATE INDEX "idx_player_stats_team_id" ON "public"."player_stats" USING "btree" ("team_id");



CREATE INDEX "idx_player_team_seasons_player" ON "public"."player_team_seasons" USING "btree" ("player_id");



CREATE INDEX "idx_player_team_seasons_season" ON "public"."player_team_seasons" USING "btree" ("season_id");



CREATE INDEX "idx_player_team_seasons_team" ON "public"."player_team_seasons" USING "btree" ("team_id");



CREATE INDEX "idx_players_roblox_user_id" ON "public"."players" USING "btree" ("roblox_user_id");



CREATE INDEX "idx_playoff_brackets_loser_next" ON "public"."playoff_brackets" USING "btree" ("loser_next_bracket_id");



CREATE INDEX "idx_playoff_brackets_next" ON "public"."playoff_brackets" USING "btree" ("next_bracket_id");



CREATE INDEX "idx_playoff_brackets_round" ON "public"."playoff_brackets" USING "btree" ("round");



CREATE INDEX "idx_playoff_brackets_season" ON "public"."playoff_brackets" USING "btree" ("season_id");



CREATE INDEX "idx_seasons_is_active" ON "public"."seasons" USING "btree" ("is_active") WHERE ("is_active" = true);



CREATE INDEX "idx_seasons_region_id" ON "public"."seasons" USING "btree" ("region_id");



CREATE INDEX "idx_teams_previous_team_id" ON "public"."teams" USING "btree" ("previous_team_id") WHERE ("previous_team_id" IS NOT NULL);



CREATE INDEX "idx_teams_season_id" ON "public"."teams" USING "btree" ("season_id");



CREATE INDEX "idx_teams_slug" ON "public"."teams" USING "btree" ("slug") WHERE ("deleted_at" IS NULL);



CREATE UNIQUE INDEX "idx_teams_slug_season_active" ON "public"."teams" USING "btree" ("slug", "season_id") WHERE ("deleted_at" IS NULL);



CREATE UNIQUE INDEX "idx_unique_active_player_season" ON "public"."player_team_seasons" USING "btree" ("player_id", "season_id") WHERE ("left_at" IS NULL);



CREATE INDEX "idx_user_roles_user_id" ON "public"."user_roles" USING "btree" ("user_id");



CREATE OR REPLACE TRIGGER "trigger_update_officials_updated_at" BEFORE UPDATE ON "public"."officials" FOR EACH ROW EXECUTE FUNCTION "public"."update_officials_updated_at"();



ALTER TABLE ONLY "public"."match_officials"
    ADD CONSTRAINT "match_officials_match_id_fkey" FOREIGN KEY ("match_id") REFERENCES "public"."matches"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."match_officials"
    ADD CONSTRAINT "match_officials_official_id_fkey" FOREIGN KEY ("official_id") REFERENCES "public"."officials"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."match_sets"
    ADD CONSTRAINT "match_sets_match_id_fkey" FOREIGN KEY ("match_id") REFERENCES "public"."matches"("id") ON DELETE CASCADE;



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



ALTER TABLE ONLY "public"."pending_users"
    ADD CONSTRAINT "pending_users_invited_by_fkey" FOREIGN KEY ("invited_by") REFERENCES "auth"."users"("id");



ALTER TABLE ONLY "public"."player_stats"
    ADD CONSTRAINT "player_stats_match_id_fkey" FOREIGN KEY ("match_id") REFERENCES "public"."matches"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."player_stats"
    ADD CONSTRAINT "player_stats_player_id_fkey" FOREIGN KEY ("player_id") REFERENCES "public"."players"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."player_stats"
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



ALTER TABLE ONLY "public"."seasons"
    ADD CONSTRAINT "seasons_playoff_config_id_fkey" FOREIGN KEY ("playoff_config_id") REFERENCES "public"."playoff_configs"("id");



ALTER TABLE ONLY "public"."seasons"
    ADD CONSTRAINT "seasons_region_id_fkey" FOREIGN KEY ("region_id") REFERENCES "public"."regions"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."teams"
    ADD CONSTRAINT "teams_previous_team_id_fkey" FOREIGN KEY ("previous_team_id") REFERENCES "public"."teams"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."teams"
    ADD CONSTRAINT "teams_season_id_fkey" FOREIGN KEY ("season_id") REFERENCES "public"."seasons"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."user_roles"
    ADD CONSTRAINT "user_roles_promoted_by_fkey" FOREIGN KEY ("promoted_by") REFERENCES "auth"."users"("id");



ALTER TABLE ONLY "public"."user_roles"
    ADD CONSTRAINT "user_roles_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



CREATE POLICY "Admins can delete officials" ON "public"."officials" FOR DELETE USING ((EXISTS ( SELECT 1
   FROM "public"."user_roles"
  WHERE (("user_roles"."user_id" = "auth"."uid"()) AND ("user_roles"."role" = ANY (ARRAY['admin'::"text", 'super_admin'::"text"]))))));



CREATE POLICY "Admins can insert officials" ON "public"."officials" FOR INSERT WITH CHECK ((EXISTS ( SELECT 1
   FROM "public"."user_roles"
  WHERE (("user_roles"."user_id" = "auth"."uid"()) AND ("user_roles"."role" = ANY (ARRAY['admin'::"text", 'super_admin'::"text"]))))));



CREATE POLICY "Admins can update officials" ON "public"."officials" FOR UPDATE USING ((EXISTS ( SELECT 1
   FROM "public"."user_roles"
  WHERE (("user_roles"."user_id" = "auth"."uid"()) AND ("user_roles"."role" = ANY (ARRAY['admin'::"text", 'super_admin'::"text"]))))));



CREATE POLICY "Public users can view officials" ON "public"."officials" FOR SELECT USING (true);



CREATE POLICY "admins can delete match_officials" ON "public"."match_officials" FOR DELETE TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."user_roles"
  WHERE (("user_roles"."user_id" = ( SELECT "auth"."uid"() AS "uid")) AND ("user_roles"."role" = ANY (ARRAY['admin'::"text", 'super_admin'::"text"]))))));



CREATE POLICY "admins can delete match_sets" ON "public"."match_sets" FOR DELETE TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."user_roles"
  WHERE (("user_roles"."user_id" = ( SELECT "auth"."uid"() AS "uid")) AND ("user_roles"."role" = ANY (ARRAY['admin'::"text", 'super_admin'::"text"]))))));



CREATE POLICY "admins can delete matches" ON "public"."matches" FOR DELETE TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."user_roles"
  WHERE (("user_roles"."user_id" = ( SELECT "auth"."uid"() AS "uid")) AND ("user_roles"."role" = ANY (ARRAY['admin'::"text", 'super_admin'::"text"]))))));



CREATE POLICY "admins can delete player_stats" ON "public"."player_stats" FOR DELETE TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."user_roles"
  WHERE (("user_roles"."user_id" = ( SELECT "auth"."uid"() AS "uid")) AND ("user_roles"."role" = ANY (ARRAY['admin'::"text", 'super_admin'::"text"]))))));



CREATE POLICY "admins can delete player_team_seasons" ON "public"."player_team_seasons" FOR DELETE TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."user_roles"
  WHERE (("user_roles"."user_id" = ( SELECT "auth"."uid"() AS "uid")) AND ("user_roles"."role" = ANY (ARRAY['admin'::"text", 'super_admin'::"text"]))))));



CREATE POLICY "admins can delete players" ON "public"."players" FOR DELETE TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."user_roles"
  WHERE (("user_roles"."user_id" = ( SELECT "auth"."uid"() AS "uid")) AND ("user_roles"."role" = ANY (ARRAY['admin'::"text", 'super_admin'::"text"]))))));



CREATE POLICY "admins can delete playoff_brackets" ON "public"."playoff_brackets" FOR DELETE TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."user_roles"
  WHERE (("user_roles"."user_id" = ( SELECT "auth"."uid"() AS "uid")) AND ("user_roles"."role" = ANY (ARRAY['admin'::"text", 'super_admin'::"text"]))))));



CREATE POLICY "admins can delete playoff_configs" ON "public"."playoff_configs" FOR DELETE TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."user_roles"
  WHERE (("user_roles"."user_id" = ( SELECT "auth"."uid"() AS "uid")) AND ("user_roles"."role" = ANY (ARRAY['admin'::"text", 'super_admin'::"text"]))))));



CREATE POLICY "admins can delete regions" ON "public"."regions" FOR DELETE TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."user_roles"
  WHERE (("user_roles"."user_id" = "auth"."uid"()) AND ("user_roles"."role" = ANY (ARRAY['admin'::"text", 'super_admin'::"text"]))))));



CREATE POLICY "admins can delete seasons" ON "public"."seasons" FOR DELETE TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."user_roles"
  WHERE (("user_roles"."user_id" = ( SELECT "auth"."uid"() AS "uid")) AND ("user_roles"."role" = ANY (ARRAY['admin'::"text", 'super_admin'::"text"]))))));



CREATE POLICY "admins can delete teams" ON "public"."teams" FOR DELETE TO "authenticated" USING ((EXISTS ( SELECT 1
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



CREATE POLICY "admins can insert player_stats" ON "public"."player_stats" FOR INSERT TO "authenticated" WITH CHECK ((EXISTS ( SELECT 1
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



CREATE POLICY "admins can insert seasons" ON "public"."seasons" FOR INSERT TO "authenticated" WITH CHECK ((EXISTS ( SELECT 1
   FROM "public"."user_roles"
  WHERE (("user_roles"."user_id" = ( SELECT "auth"."uid"() AS "uid")) AND ("user_roles"."role" = ANY (ARRAY['admin'::"text", 'super_admin'::"text"]))))));



CREATE POLICY "admins can insert teams" ON "public"."teams" FOR INSERT TO "authenticated" WITH CHECK ((EXISTS ( SELECT 1
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



CREATE POLICY "admins can update player_stats" ON "public"."player_stats" FOR UPDATE TO "authenticated" USING ((EXISTS ( SELECT 1
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



CREATE POLICY "admins can update seasons" ON "public"."seasons" FOR UPDATE TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."user_roles"
  WHERE (("user_roles"."user_id" = ( SELECT "auth"."uid"() AS "uid")) AND ("user_roles"."role" = ANY (ARRAY['admin'::"text", 'super_admin'::"text"]))))));



CREATE POLICY "admins can update teams" ON "public"."teams" FOR UPDATE TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."user_roles"
  WHERE (("user_roles"."user_id" = ( SELECT "auth"."uid"() AS "uid")) AND ("user_roles"."role" = ANY (ARRAY['admin'::"text", 'super_admin'::"text"]))))));



CREATE POLICY "anyone can read match_officials" ON "public"."match_officials" FOR SELECT TO "authenticated", "anon" USING (true);



CREATE POLICY "anyone can read match_sets" ON "public"."match_sets" FOR SELECT TO "authenticated", "anon" USING (true);



CREATE POLICY "anyone can read matches" ON "public"."matches" FOR SELECT TO "authenticated", "anon" USING (true);



CREATE POLICY "anyone can read player_stats" ON "public"."player_stats" FOR SELECT TO "authenticated", "anon" USING (true);



CREATE POLICY "anyone can read player_team_seasons" ON "public"."player_team_seasons" FOR SELECT TO "authenticated", "anon" USING (true);



CREATE POLICY "anyone can read players" ON "public"."players" FOR SELECT TO "authenticated", "anon" USING (true);



CREATE POLICY "anyone can read playoff_brackets" ON "public"."playoff_brackets" FOR SELECT TO "authenticated", "anon" USING (true);



CREATE POLICY "anyone can read playoff_configs" ON "public"."playoff_configs" FOR SELECT TO "authenticated", "anon" USING (true);



CREATE POLICY "anyone can read regions" ON "public"."regions" FOR SELECT TO "authenticated", "anon" USING (true);



CREATE POLICY "anyone can read seasons" ON "public"."seasons" FOR SELECT TO "authenticated", "anon" USING (true);



CREATE POLICY "anyone can read teams" ON "public"."teams" FOR SELECT TO "authenticated", "anon" USING (true);



CREATE POLICY "invitee_read_own_invite" ON "public"."pending_users" FOR SELECT TO "authenticated", "anon" USING (("email" = ("auth"."jwt"() ->> 'email'::"text")));



ALTER TABLE "public"."match_officials" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."match_sets" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."matches" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."officials" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."pending_users" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."player_stats" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."player_team_seasons" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."players" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."playoff_brackets" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."playoff_configs" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "read_own_role" ON "public"."user_roles" FOR SELECT TO "authenticated" USING (("user_id" = "auth"."uid"()));



ALTER TABLE "public"."regions" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."seasons" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "service_role_all" ON "public"."user_roles" TO "service_role" USING (("role" = 'super_admin'::"text"));



CREATE POLICY "super_admin_can_invite" ON "public"."pending_users" FOR INSERT TO "authenticated" WITH CHECK ((EXISTS ( SELECT 1
   FROM "public"."user_roles" "ur"
  WHERE (("ur"."user_id" = "auth"."uid"()) AND ("ur"."role" = 'super_admin'::"text")))));



CREATE POLICY "super_admin_read_pending" ON "public"."pending_users" FOR SELECT TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."user_roles" "ur"
  WHERE (("ur"."user_id" = "auth"."uid"()) AND ("ur"."role" = 'super_admin'::"text")))));



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

























































































































































GRANT ALL ON FUNCTION "public"."add_to_pending_users"() TO "anon";
GRANT ALL ON FUNCTION "public"."add_to_pending_users"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."add_to_pending_users"() TO "service_role";



GRANT ALL ON FUNCTION "public"."assign_role_from_invite"() TO "anon";
GRANT ALL ON FUNCTION "public"."assign_role_from_invite"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."assign_role_from_invite"() TO "service_role";



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



GRANT ALL ON FUNCTION "public"."search_officials_with_similarity"("search_term" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."search_officials_with_similarity"("search_term" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."search_officials_with_similarity"("search_term" "text") TO "service_role";



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


















GRANT ALL ON TABLE "public"."match_officials" TO "anon";
GRANT ALL ON TABLE "public"."match_officials" TO "authenticated";
GRANT ALL ON TABLE "public"."match_officials" TO "service_role";



GRANT ALL ON TABLE "public"."match_sets" TO "anon";
GRANT ALL ON TABLE "public"."match_sets" TO "authenticated";
GRANT ALL ON TABLE "public"."match_sets" TO "service_role";



GRANT ALL ON TABLE "public"."matches" TO "anon";
GRANT ALL ON TABLE "public"."matches" TO "authenticated";
GRANT ALL ON TABLE "public"."matches" TO "service_role";



GRANT ALL ON TABLE "public"."officials" TO "anon";
GRANT ALL ON TABLE "public"."officials" TO "authenticated";
GRANT ALL ON TABLE "public"."officials" TO "service_role";



GRANT ALL ON TABLE "public"."pending_users" TO "anon";
GRANT ALL ON TABLE "public"."pending_users" TO "authenticated";
GRANT ALL ON TABLE "public"."pending_users" TO "service_role";



GRANT ALL ON TABLE "public"."player_stats" TO "anon";
GRANT ALL ON TABLE "public"."player_stats" TO "authenticated";
GRANT ALL ON TABLE "public"."player_stats" TO "service_role";



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



GRANT ALL ON TABLE "public"."regions" TO "anon";
GRANT ALL ON TABLE "public"."regions" TO "authenticated";
GRANT ALL ON TABLE "public"."regions" TO "service_role";



GRANT ALL ON TABLE "public"."seasons" TO "anon";
GRANT ALL ON TABLE "public"."seasons" TO "authenticated";
GRANT ALL ON TABLE "public"."seasons" TO "service_role";



GRANT ALL ON TABLE "public"."teams" TO "anon";
GRANT ALL ON TABLE "public"."teams" TO "authenticated";
GRANT ALL ON TABLE "public"."teams" TO "service_role";



GRANT ALL ON TABLE "public"."standings" TO "anon";
GRANT ALL ON TABLE "public"."standings" TO "authenticated";
GRANT ALL ON TABLE "public"."standings" TO "service_role";



GRANT ALL ON TABLE "public"."user_roles" TO "anon";
GRANT ALL ON TABLE "public"."user_roles" TO "authenticated";
GRANT ALL ON TABLE "public"."user_roles" TO "service_role";









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































drop extension if exists "pg_net";

drop policy "anyone can read match_officials" on "public"."match_officials";

drop policy "anyone can read match_sets" on "public"."match_sets";

drop policy "anyone can read matches" on "public"."matches";

drop policy "invitee_read_own_invite" on "public"."pending_users";

drop policy "anyone can read player_stats" on "public"."player_stats";

drop policy "anyone can read player_team_seasons" on "public"."player_team_seasons";

drop policy "anyone can read players" on "public"."players";

drop policy "anyone can read playoff_brackets" on "public"."playoff_brackets";

drop policy "anyone can read playoff_configs" on "public"."playoff_configs";

drop policy "anyone can read regions" on "public"."regions";

drop policy "anyone can read seasons" on "public"."seasons";

drop policy "anyone can read teams" on "public"."teams";


  create policy "anyone can read match_officials"
  on "public"."match_officials"
  as permissive
  for select
  to anon, authenticated
using (true);



  create policy "anyone can read match_sets"
  on "public"."match_sets"
  as permissive
  for select
  to anon, authenticated
using (true);



  create policy "anyone can read matches"
  on "public"."matches"
  as permissive
  for select
  to anon, authenticated
using (true);



  create policy "invitee_read_own_invite"
  on "public"."pending_users"
  as permissive
  for select
  to anon, authenticated
using ((email = (auth.jwt() ->> 'email'::text)));



  create policy "anyone can read player_stats"
  on "public"."player_stats"
  as permissive
  for select
  to anon, authenticated
using (true);



  create policy "anyone can read player_team_seasons"
  on "public"."player_team_seasons"
  as permissive
  for select
  to anon, authenticated
using (true);



  create policy "anyone can read players"
  on "public"."players"
  as permissive
  for select
  to anon, authenticated
using (true);



  create policy "anyone can read playoff_brackets"
  on "public"."playoff_brackets"
  as permissive
  for select
  to anon, authenticated
using (true);



  create policy "anyone can read playoff_configs"
  on "public"."playoff_configs"
  as permissive
  for select
  to anon, authenticated
using (true);



  create policy "anyone can read regions"
  on "public"."regions"
  as permissive
  for select
  to anon, authenticated
using (true);



  create policy "anyone can read seasons"
  on "public"."seasons"
  as permissive
  for select
  to anon, authenticated
using (true);



  create policy "anyone can read teams"
  on "public"."teams"
  as permissive
  for select
  to anon, authenticated
using (true);


CREATE TRIGGER on_auth_user_created AFTER INSERT ON auth.users FOR EACH ROW EXECUTE FUNCTION public.assign_role_from_invite();


  create policy "Allow admin delete from public-assets"
  on "storage"."objects"
  as permissive
  for delete
  to authenticated
using (((bucket_id = 'public-assets'::text) AND (EXISTS ( SELECT 1
   FROM public.user_roles
  WHERE ((user_roles.user_id = auth.uid()) AND (user_roles.role = ANY (ARRAY['admin'::text, 'super_admin'::text])))))));



  create policy "Allow admin insert to public-assets"
  on "storage"."objects"
  as permissive
  for insert
  to authenticated
with check (((bucket_id = 'public-assets'::text) AND (EXISTS ( SELECT 1
   FROM public.user_roles
  WHERE ((user_roles.user_id = auth.uid()) AND (user_roles.role = ANY (ARRAY['admin'::text, 'super_admin'::text])))))));



  create policy "Allow admin update in public-assets"
  on "storage"."objects"
  as permissive
  for update
  to authenticated
using ((bucket_id = 'public-assets'::text))
with check (((bucket_id = 'public-assets'::text) AND (EXISTS ( SELECT 1
   FROM public.user_roles
  WHERE ((user_roles.user_id = auth.uid()) AND (user_roles.role = ANY (ARRAY['admin'::text, 'super_admin'::text])))))));



  create policy "Allow public read from public-assets"
  on "storage"."objects"
  as permissive
  for select
  to public
using ((bucket_id = 'public-assets'::text));



