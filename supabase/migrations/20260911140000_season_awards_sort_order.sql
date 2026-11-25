ALTER TABLE "public"."season_awards" ADD COLUMN "sort_order" integer NOT NULL DEFAULT 0;

WITH ordered AS (
  SELECT "id",
         row_number() OVER (PARTITION BY "season_id" ORDER BY "awarded_at", "created_at") - 1 AS "rn"
  FROM "public"."season_awards"
)
UPDATE "public"."season_awards" a
   SET "sort_order" = o."rn"
  FROM ordered o
 WHERE o."id" = a."id";
