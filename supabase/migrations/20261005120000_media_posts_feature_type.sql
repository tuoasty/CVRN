ALTER TABLE "public"."media_posts"
    DROP CONSTRAINT "media_posts_type_check",
    ADD CONSTRAINT "media_posts_type_check"
        CHECK (type IN ('gfx', 'video', 'news', 'recap', 'clip', 'totw', 'potw', 'article', 'champion', 'feature'));
