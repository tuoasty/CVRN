ALTER TABLE "public"."media_posts"
    DROP CONSTRAINT "media_posts_type_check",
    ADD CONSTRAINT "media_posts_type_check"
        CHECK (type IN ('gfx', 'video', 'news', 'recap', 'clip', 'totw', 'potw', 'article'));

CREATE TABLE "public"."article_media" (
    "id"            uuid        NOT NULL DEFAULT gen_random_uuid(),
    "article_id"    uuid        NOT NULL,
    "media_post_id" uuid        NOT NULL,
    "handle"        text        NOT NULL,
    "placement"     text        NOT NULL DEFAULT 'center',
    "sort_order"    integer     NOT NULL DEFAULT 0,
    "created_at"    timestamptz NOT NULL DEFAULT now(),
    CONSTRAINT "article_media_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "article_media_placement_check" CHECK ("placement" IN ('left', 'center', 'right')),
    CONSTRAINT "article_media_article_id_fkey"    FOREIGN KEY ("article_id")    REFERENCES "public"."articles"("id")     ON DELETE CASCADE,
    CONSTRAINT "article_media_media_post_id_fkey" FOREIGN KEY ("media_post_id") REFERENCES "public"."media_posts"("id")  ON DELETE CASCADE,
    CONSTRAINT "article_media_article_handle_key"    UNIQUE ("article_id", "handle"),
    CONSTRAINT "article_media_article_media_post_key" UNIQUE ("article_id", "media_post_id")
);

CREATE INDEX "article_media_article_id_idx"    ON "public"."article_media" ("article_id");
CREATE INDEX "article_media_media_post_id_idx" ON "public"."article_media" ("media_post_id");

ALTER TABLE "public"."article_media" ENABLE ROW LEVEL SECURITY;

CREATE POLICY "anyone can read article_media" ON "public"."article_media"
    FOR SELECT TO "authenticated", "anon" USING (true);

CREATE POLICY "admins can insert article_media" ON "public"."article_media"
    FOR INSERT TO "authenticated"
    WITH CHECK ((EXISTS (SELECT 1 FROM "public"."user_roles"
        WHERE (("user_roles"."user_id" = (SELECT "auth"."uid"() AS "uid"))
            AND ("user_roles"."role" = ANY (ARRAY['admin'::"text", 'super_admin'::"text"]))))));

CREATE POLICY "admins can update article_media" ON "public"."article_media"
    FOR UPDATE TO "authenticated"
    USING ((EXISTS (SELECT 1 FROM "public"."user_roles"
        WHERE (("user_roles"."user_id" = (SELECT "auth"."uid"() AS "uid"))
            AND ("user_roles"."role" = ANY (ARRAY['admin'::"text", 'super_admin'::"text"]))))));

CREATE POLICY "admins can delete article_media" ON "public"."article_media"
    FOR DELETE TO "authenticated"
    USING ((EXISTS (SELECT 1 FROM "public"."user_roles"
        WHERE (("user_roles"."user_id" = (SELECT "auth"."uid"() AS "uid"))
            AND ("user_roles"."role" = ANY (ARRAY['admin'::"text", 'super_admin'::"text"]))))));

INSERT INTO "public"."article_media" ("article_id", "media_post_id", "handle", "placement", "sort_order")
SELECT "article_id", "id", 'cover', 'center', 0
FROM "public"."media_posts"
WHERE "article_id" IS NOT NULL;

UPDATE "public"."media_posts"
SET "type" = 'article'
WHERE "article_id" IS NOT NULL;
