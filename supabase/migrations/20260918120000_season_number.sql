ALTER TABLE "public"."seasons" ADD COLUMN "season_number" integer;

WITH ordered AS (
    SELECT id, ROW_NUMBER() OVER (PARTITION BY region_id ORDER BY start_date ASC) AS rn
    FROM "public"."seasons"
)
UPDATE "public"."seasons" s SET season_number = o.rn FROM ordered o WHERE s.id = o.id;

ALTER TABLE "public"."seasons" ALTER COLUMN "season_number" SET NOT NULL;

CREATE UNIQUE INDEX "idx_seasons_region_season_number" ON "public"."seasons" ("region_id", "season_number");
