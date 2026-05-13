CREATE TYPE "public"."award_category" AS ENUM (
    'individual_winners',
    'first_team',
    'staff_team'
);

ALTER TABLE "public"."season_awards"
    ADD COLUMN "category"            award_category  NOT NULL DEFAULT 'individual_winners',
    ADD COLUMN "avatar_bucket_path"  text;

ALTER TABLE "public"."season_awards"
    DROP COLUMN IF EXISTS "full_avatar_synced_at";

CREATE POLICY "admins can update season_awards" ON "public"."season_awards"
    FOR UPDATE TO "authenticated"
    USING ((EXISTS (SELECT 1 FROM "public"."user_roles"
        WHERE (("user_roles"."user_id" = (SELECT "auth"."uid"() AS "uid"))
            AND ("user_roles"."role" = ANY (ARRAY['admin'::"text", 'super_admin'::"text"]))))));
