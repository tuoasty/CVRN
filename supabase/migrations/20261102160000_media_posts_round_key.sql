ALTER TABLE "public"."media_posts" ADD COLUMN "round_key" text;

CREATE UNIQUE INDEX "media_posts_one_round_slot"
    ON "public"."media_posts" ("season_id", "type", "round_key")
    WHERE "round_key" IS NOT NULL AND "type" IN ('potw', 'totw');
