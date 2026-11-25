CREATE TABLE "public"."spec_winners" (
  "id"            "uuid" PRIMARY KEY DEFAULT "gen_random_uuid"(),
  "season_id"     "uuid" NOT NULL REFERENCES "public"."seasons"("id") ON DELETE CASCADE,
  "spec_id"       "uuid" NOT NULL REFERENCES "public"."specs"("id") ON DELETE RESTRICT,
  "player_id"     "uuid" NOT NULL REFERENCES "public"."players"("id"),
  "stars_awarded" smallint NOT NULL CHECK ("stars_awarded" BETWEEN 1 AND 5),
  "created_at"    timestamp with time zone NOT NULL DEFAULT "now"(),
  "updated_at"    timestamp with time zone NOT NULL DEFAULT "now"(),
  CONSTRAINT "spec_winners_season_spec_unique" UNIQUE ("season_id", "spec_id")
);

CREATE INDEX "spec_winners_player_id_idx" ON "public"."spec_winners" ("player_id");
CREATE INDEX "spec_winners_season_id_idx" ON "public"."spec_winners" ("season_id");

ALTER TABLE "public"."spec_winners" ENABLE ROW LEVEL SECURITY;

CREATE POLICY "anyone can read spec_winners" ON "public"."spec_winners"
  FOR SELECT TO "authenticated", "anon" USING (true);

CREATE POLICY "spec managers can manage spec_winners" ON "public"."spec_winners"
  FOR ALL TO "authenticated"
  USING ((EXISTS ( SELECT 1 FROM "public"."user_roles"
    WHERE (("user_roles"."user_id" = ( SELECT "auth"."uid"() AS "uid"))
      AND ("user_roles"."role" = ANY (ARRAY['admin'::"text", 'super_admin'::"text", 'spec_manager'::"text"]))))))
  WITH CHECK ((EXISTS ( SELECT 1 FROM "public"."user_roles"
    WHERE (("user_roles"."user_id" = ( SELECT "auth"."uid"() AS "uid"))
      AND ("user_roles"."role" = ANY (ARRAY['admin'::"text", 'super_admin'::"text", 'spec_manager'::"text"]))))));

ALTER TABLE "public"."spec_winners" OWNER TO "postgres";

GRANT ALL ON TABLE "public"."spec_winners" TO "anon";
GRANT ALL ON TABLE "public"."spec_winners" TO "authenticated";
GRANT ALL ON TABLE "public"."spec_winners" TO "service_role";
