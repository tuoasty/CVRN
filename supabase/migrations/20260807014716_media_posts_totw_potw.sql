ALTER TABLE "public"."media_posts"
    ADD COLUMN "player_id" uuid REFERENCES "public"."players"("id") ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS "media_posts_player_id_idx"
    ON "public"."media_posts" ("player_id") WHERE "player_id" IS NOT NULL;

ALTER TABLE "public"."media_posts"
    DROP CONSTRAINT "media_posts_type_check",
    ADD CONSTRAINT "media_posts_type_check"
        CHECK (type IN ('gfx', 'video', 'news', 'recap', 'clip', 'totw', 'potw'));