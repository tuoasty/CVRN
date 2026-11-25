
ALTER TABLE "public"."media_posts" DROP CONSTRAINT "media_posts_match_id_fkey";

ALTER TABLE "public"."media_posts"
    ADD CONSTRAINT "media_posts_match_id_fkey"
    FOREIGN KEY ("match_id") REFERENCES "public"."matches"("id") ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS "media_posts_match_id_idx"
    ON "public"."media_posts" ("match_id") WHERE "match_id" IS NOT NULL;
