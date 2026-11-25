ALTER TABLE "public"."season_awards"
  ADD COLUMN "all_star_team" text CHECK ("all_star_team" IN ('A', 'B')),
  ADD COLUMN "all_star_slot" text CHECK ("all_star_slot" IN ('starter', 'sub'));

ALTER TABLE "public"."season_awards"
  ADD CONSTRAINT "season_awards_all_star_fields_check" CHECK (
    CASE WHEN "category" = 'all_star'
      THEN "all_star_team" IS NOT NULL AND "all_star_slot" IS NOT NULL
      ELSE "all_star_team" IS NULL AND "all_star_slot" IS NULL
    END
  );

CREATE TABLE "public"."season_all_star_teams" (
  "season_id"  "uuid" NOT NULL REFERENCES "public"."seasons"("id") ON DELETE CASCADE,
  "code"       text NOT NULL CHECK ("code" IN ('A', 'B')),
  "name"       text NOT NULL CHECK (length(btrim("name")) > 0),
  "updated_at" timestamp with time zone NOT NULL DEFAULT "now"(),
  PRIMARY KEY ("season_id", "code")
);

ALTER TABLE "public"."season_all_star_teams" ENABLE ROW LEVEL SECURITY;

CREATE POLICY "anyone can read season_all_star_teams" ON "public"."season_all_star_teams"
  FOR SELECT TO "authenticated", "anon" USING (true);

CREATE POLICY "admins can insert season_all_star_teams" ON "public"."season_all_star_teams"
  FOR INSERT TO "authenticated"
  WITH CHECK ((EXISTS ( SELECT 1 FROM "public"."user_roles"
    WHERE (("user_roles"."user_id" = ( SELECT "auth"."uid"() AS "uid"))
      AND ("user_roles"."role" = ANY (ARRAY['admin'::"text", 'super_admin'::"text"]))))));

CREATE POLICY "admins can update season_all_star_teams" ON "public"."season_all_star_teams"
  FOR UPDATE TO "authenticated"
  USING ((EXISTS ( SELECT 1 FROM "public"."user_roles"
    WHERE (("user_roles"."user_id" = ( SELECT "auth"."uid"() AS "uid"))
      AND ("user_roles"."role" = ANY (ARRAY['admin'::"text", 'super_admin'::"text"]))))));

CREATE POLICY "admins can delete season_all_star_teams" ON "public"."season_all_star_teams"
  FOR DELETE TO "authenticated"
  USING ((EXISTS ( SELECT 1 FROM "public"."user_roles"
    WHERE (("user_roles"."user_id" = ( SELECT "auth"."uid"() AS "uid"))
      AND ("user_roles"."role" = ANY (ARRAY['admin'::"text", 'super_admin'::"text"]))))));
