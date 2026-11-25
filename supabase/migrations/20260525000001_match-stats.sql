
ALTER TABLE "public"."player_stats" RENAME TO "player_match_stats";

ALTER TABLE "public"."player_match_stats"
  DROP CONSTRAINT "player_stats_match_id_player_id_key",

  ADD COLUMN "set_number"     integer NOT NULL CHECK ("set_number" BETWEEN 1 AND 5),

  ADD COLUMN "ape_kills"      integer NOT NULL CHECK ("ape_kills" >= 0),
  ADD COLUMN "ape_attempts"   integer NOT NULL CHECK ("ape_attempts" >= 0),
  ADD COLUMN "delay_kills"    integer NOT NULL CHECK ("delay_kills" >= 0),
  ADD COLUMN "quick_kills"    integer NOT NULL CHECK ("quick_kills" >= 0),
  ADD COLUMN "wipes_tools"    integer NOT NULL CHECK ("wipes_tools" >= 0),
  ADD COLUMN "kill_attempts"  integer NOT NULL CHECK ("kill_attempts" >= 0),
  ADD COLUMN "spiking_errors" integer NOT NULL CHECK ("spiking_errors" >= 0),

  ADD COLUMN "assists"        integer NOT NULL CHECK ("assists" >= 0),
  ADD COLUMN "setting_errors" integer NOT NULL CHECK ("setting_errors" >= 0),

  ADD COLUMN "kill_blocks"    integer NOT NULL CHECK ("kill_blocks" >= 0),
  ADD COLUMN "block_touches"  integer NOT NULL CHECK ("block_touches" >= 0),

  ADD COLUMN "serve_receives" integer NOT NULL CHECK ("serve_receives" >= 0),
  ADD COLUMN "digs"           integer NOT NULL CHECK ("digs" >= 0),
  ADD COLUMN "block_follows"  integer NOT NULL CHECK ("block_follows" >= 0),
  ADD COLUMN "dives"          integer NOT NULL CHECK ("dives" >= 0),

  ADD COLUMN "aces"           integer NOT NULL CHECK ("aces" >= 0),
  ADD COLUMN "service_errors" integer NOT NULL CHECK ("service_errors" >= 0),

  ADD COLUMN "misc_errors"    integer NOT NULL CHECK ("misc_errors" >= 0);

ALTER TABLE "public"."player_match_stats"
  ADD CONSTRAINT "player_match_stats_match_id_player_id_set_number_key"
    UNIQUE ("match_id", "player_id", "set_number");

DROP POLICY IF EXISTS "anyone can read player_stats"   ON "public"."player_match_stats";
DROP POLICY IF EXISTS "admins can insert player_stats" ON "public"."player_match_stats";
DROP POLICY IF EXISTS "admins can update player_stats" ON "public"."player_match_stats";
DROP POLICY IF EXISTS "admins can delete player_stats" ON "public"."player_match_stats";

CREATE POLICY "anyone can read player_match_stats" ON "public"."player_match_stats"
  FOR SELECT TO "authenticated", "anon" USING (true);

CREATE POLICY "stat managers can insert player_match_stats" ON "public"."player_match_stats"
  FOR INSERT TO "authenticated"
  WITH CHECK ((EXISTS ( SELECT 1 FROM "public"."user_roles"
    WHERE (("user_roles"."user_id" = ( SELECT "auth"."uid"() AS "uid"))
      AND ("user_roles"."role" = ANY (ARRAY['stat_tracker'::"text", 'admin'::"text", 'super_admin'::"text"]))))));

CREATE POLICY "stat managers can update player_match_stats" ON "public"."player_match_stats"
  FOR UPDATE TO "authenticated"
  USING ((EXISTS ( SELECT 1 FROM "public"."user_roles"
    WHERE (("user_roles"."user_id" = ( SELECT "auth"."uid"() AS "uid"))
      AND ("user_roles"."role" = ANY (ARRAY['stat_tracker'::"text", 'admin'::"text", 'super_admin'::"text"]))))));

CREATE POLICY "stat managers can delete player_match_stats" ON "public"."player_match_stats"
  FOR DELETE TO "authenticated"
  USING ((EXISTS ( SELECT 1 FROM "public"."user_roles"
    WHERE (("user_roles"."user_id" = ( SELECT "auth"."uid"() AS "uid"))
      AND ("user_roles"."role" = ANY (ARRAY['stat_tracker'::"text", 'admin'::"text", 'super_admin'::"text"]))))));

CREATE TABLE "public"."match_sheet_config" (
  "id"         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "match_id"   uuid NOT NULL UNIQUE REFERENCES "public"."matches"("id") ON DELETE CASCADE,
  "sheet_id"   text NOT NULL,
  "created_at" timestamptz NOT NULL DEFAULT now(),
  "updated_at" timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE "public"."match_sheet_config" ENABLE ROW LEVEL SECURITY;

CREATE POLICY "anyone can read match_sheet_config" ON "public"."match_sheet_config"
  FOR SELECT TO "authenticated", "anon" USING (true);

CREATE POLICY "stat managers can insert match_sheet_config" ON "public"."match_sheet_config"
  FOR INSERT TO "authenticated"
  WITH CHECK ((EXISTS ( SELECT 1 FROM "public"."user_roles"
    WHERE (("user_roles"."user_id" = ( SELECT "auth"."uid"() AS "uid"))
      AND ("user_roles"."role" = ANY (ARRAY['stat_tracker'::"text", 'admin'::"text", 'super_admin'::"text"]))))));

CREATE POLICY "stat managers can update match_sheet_config" ON "public"."match_sheet_config"
  FOR UPDATE TO "authenticated"
  USING ((EXISTS ( SELECT 1 FROM "public"."user_roles"
    WHERE (("user_roles"."user_id" = ( SELECT "auth"."uid"() AS "uid"))
      AND ("user_roles"."role" = ANY (ARRAY['stat_tracker'::"text", 'admin'::"text", 'super_admin'::"text"]))))));

CREATE POLICY "stat managers can delete match_sheet_config" ON "public"."match_sheet_config"
  FOR DELETE TO "authenticated"
  USING ((EXISTS ( SELECT 1 FROM "public"."user_roles"
    WHERE (("user_roles"."user_id" = ( SELECT "auth"."uid"() AS "uid"))
      AND ("user_roles"."role" = ANY (ARRAY['stat_tracker'::"text", 'admin'::"text", 'super_admin'::"text"]))))));
