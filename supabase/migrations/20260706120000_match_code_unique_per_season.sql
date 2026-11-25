
ALTER TABLE "public"."matches"
    DROP CONSTRAINT IF EXISTS "matches_match_code_key";

ALTER TABLE "public"."matches"
    ADD CONSTRAINT "matches_season_id_match_code_key" UNIQUE ("season_id", "match_code");
