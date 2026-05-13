CREATE TABLE "public"."season_podium" (
    "id"          uuid        NOT NULL DEFAULT gen_random_uuid(),
    "season_id"   uuid        NOT NULL REFERENCES "public"."seasons"("id") ON DELETE CASCADE,
    "team_id"     uuid        NOT NULL REFERENCES "public"."teams"("id"),
    "place"       integer     NOT NULL CHECK ("place" IN (1, 2, 3)),
    "is_override" boolean     NOT NULL DEFAULT false,
    "notes"       text,
    "created_at"  timestamptz NOT NULL DEFAULT now(),
    "updated_at"  timestamptz NOT NULL DEFAULT now(),
    CONSTRAINT "season_podium_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "season_podium_season_place_unique" UNIQUE ("season_id", "place")
);

ALTER TABLE "public"."season_podium" ENABLE ROW LEVEL SECURITY;

CREATE POLICY "anyone can read season_podium" ON "public"."season_podium"
    FOR SELECT TO "authenticated", "anon" USING (true);

CREATE POLICY "admins can insert season_podium" ON "public"."season_podium"
    FOR INSERT TO "authenticated"
    WITH CHECK ((EXISTS (SELECT 1 FROM "public"."user_roles"
        WHERE (("user_roles"."user_id" = (SELECT "auth"."uid"() AS "uid"))
            AND ("user_roles"."role" = ANY (ARRAY['admin'::"text", 'super_admin'::"text"]))))));

CREATE POLICY "admins can update season_podium" ON "public"."season_podium"
    FOR UPDATE TO "authenticated"
    USING ((EXISTS (SELECT 1 FROM "public"."user_roles"
        WHERE (("user_roles"."user_id" = (SELECT "auth"."uid"() AS "uid"))
            AND ("user_roles"."role" = ANY (ARRAY['admin'::"text", 'super_admin'::"text"]))))));

CREATE POLICY "admins can delete season_podium" ON "public"."season_podium"
    FOR DELETE TO "authenticated"
    USING ((EXISTS (SELECT 1 FROM "public"."user_roles"
        WHERE (("user_roles"."user_id" = (SELECT "auth"."uid"() AS "uid"))
            AND ("user_roles"."role" = ANY (ARRAY['admin'::"text", 'super_admin'::"text"]))))));

CREATE TABLE "public"."season_awards" (
    "id"          uuid        NOT NULL DEFAULT gen_random_uuid(),
    "season_id"   uuid        NOT NULL REFERENCES "public"."seasons"("id") ON DELETE CASCADE,
    "player_id"   uuid        NOT NULL REFERENCES "public"."players"("id"),
    "award_name"  text        NOT NULL,
    "awarded_at"  timestamptz NOT NULL DEFAULT now(),
    "created_by"  uuid        REFERENCES "auth"."users"("id"),
    "created_at"  timestamptz NOT NULL DEFAULT now(),
    CONSTRAINT "season_awards_pkey" PRIMARY KEY ("id")
);

ALTER TABLE "public"."season_awards" ENABLE ROW LEVEL SECURITY;

CREATE POLICY "anyone can read season_awards" ON "public"."season_awards"
    FOR SELECT TO "authenticated", "anon" USING (true);

CREATE POLICY "admins can insert season_awards" ON "public"."season_awards"
    FOR INSERT TO "authenticated"
    WITH CHECK ((EXISTS (SELECT 1 FROM "public"."user_roles"
        WHERE (("user_roles"."user_id" = (SELECT "auth"."uid"() AS "uid"))
            AND ("user_roles"."role" = ANY (ARRAY['admin'::"text", 'super_admin'::"text"]))))));

CREATE POLICY "admins can delete season_awards" ON "public"."season_awards"
    FOR DELETE TO "authenticated"
    USING ((EXISTS (SELECT 1 FROM "public"."user_roles"
        WHERE (("user_roles"."user_id" = (SELECT "auth"."uid"() AS "uid"))
            AND ("user_roles"."role" = ANY (ARRAY['admin'::"text", 'super_admin'::"text"]))))));
