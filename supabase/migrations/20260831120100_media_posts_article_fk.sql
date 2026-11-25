ALTER TABLE "public"."media_posts"
    ADD COLUMN "article_id" uuid,
    ADD CONSTRAINT "media_posts_article_id_fkey" FOREIGN KEY ("article_id")
        REFERENCES "public"."articles"("id") ON DELETE CASCADE;

CREATE INDEX "media_posts_article_id_idx" ON "public"."media_posts" ("article_id")
    WHERE "article_id" IS NOT NULL;
