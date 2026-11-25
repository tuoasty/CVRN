ALTER TABLE "public"."media_posts"
    DROP CONSTRAINT "media_posts_type_check",
    ADD CONSTRAINT "media_posts_type_check"
        CHECK (type IN ('gfx', 'video', 'news', 'recap', 'clip', 'totw', 'potw', 'article', 'champion'));

CREATE UNIQUE INDEX "media_posts_one_champion_per_season"
    ON "public"."media_posts" ("season_id")
    WHERE type = 'champion';
