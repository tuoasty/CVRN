ALTER TABLE "public"."season_podium"
    DROP CONSTRAINT IF EXISTS "season_podium_place_check";

ALTER TABLE "public"."season_podium"
    ADD CONSTRAINT "season_podium_place_check" CHECK ("place" BETWEEN 1 AND 8);

ALTER TABLE "public"."season_podium"
    DROP CONSTRAINT IF EXISTS "season_podium_season_place_unique";

ALTER TABLE "public"."season_podium"
    ADD CONSTRAINT "season_podium_season_team_unique" UNIQUE ("season_id", "team_id");
