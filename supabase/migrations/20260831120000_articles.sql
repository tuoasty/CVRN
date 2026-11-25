CREATE TABLE "public"."articles" (
    "id"           uuid        NOT NULL DEFAULT gen_random_uuid(),
    "slug"         text        NOT NULL,
    "title"        text        NOT NULL,
    "body"         text        NOT NULL,
    "author_id"    uuid,
    "match_id"     uuid,
    "season_id"    uuid,
    "published_at" timestamptz,
    "created_by"   uuid        NOT NULL,
    "created_at"   timestamptz NOT NULL DEFAULT now(),
    "updated_at"   timestamptz NOT NULL DEFAULT now(),
    CONSTRAINT "articles_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "articles_slug_key" UNIQUE ("slug"),
    CONSTRAINT "articles_author_id_fkey" FOREIGN KEY ("author_id") REFERENCES "public"."players"("id")  ON DELETE SET NULL,
    CONSTRAINT "articles_match_id_fkey"  FOREIGN KEY ("match_id")  REFERENCES "public"."matches"("id")  ON DELETE SET NULL,
    CONSTRAINT "articles_season_id_fkey" FOREIGN KEY ("season_id") REFERENCES "public"."seasons"("id")  ON DELETE SET NULL,
    CONSTRAINT "articles_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "auth"."users"("id")
);

CREATE INDEX "articles_published_at_idx" ON "public"."articles" ("published_at" DESC NULLS LAST);
CREATE INDEX "articles_match_id_idx"     ON "public"."articles" ("match_id")  WHERE "match_id"  IS NOT NULL;
CREATE INDEX "articles_season_id_idx"    ON "public"."articles" ("season_id") WHERE "season_id" IS NOT NULL;

ALTER TABLE "public"."articles" ENABLE ROW LEVEL SECURITY;

CREATE POLICY "anyone can read published articles" ON "public"."articles"
    FOR SELECT TO "authenticated", "anon" USING ("published_at" IS NOT NULL);

CREATE POLICY "admins can read all articles" ON "public"."articles"
    FOR SELECT TO "authenticated"
    USING ((EXISTS (SELECT 1 FROM "public"."user_roles"
        WHERE (("user_roles"."user_id" = (SELECT "auth"."uid"() AS "uid"))
            AND ("user_roles"."role" = ANY (ARRAY['admin'::"text", 'super_admin'::"text"]))))));

CREATE POLICY "admins can insert articles" ON "public"."articles"
    FOR INSERT TO "authenticated"
    WITH CHECK ((EXISTS (SELECT 1 FROM "public"."user_roles"
        WHERE (("user_roles"."user_id" = (SELECT "auth"."uid"() AS "uid"))
            AND ("user_roles"."role" = ANY (ARRAY['admin'::"text", 'super_admin'::"text"]))))));

CREATE POLICY "admins can update articles" ON "public"."articles"
    FOR UPDATE TO "authenticated"
    USING ((EXISTS (SELECT 1 FROM "public"."user_roles"
        WHERE (("user_roles"."user_id" = (SELECT "auth"."uid"() AS "uid"))
            AND ("user_roles"."role" = ANY (ARRAY['admin'::"text", 'super_admin'::"text"]))))));

CREATE POLICY "admins can delete articles" ON "public"."articles"
    FOR DELETE TO "authenticated"
    USING ((EXISTS (SELECT 1 FROM "public"."user_roles"
        WHERE (("user_roles"."user_id" = (SELECT "auth"."uid"() AS "uid"))
            AND ("user_roles"."role" = ANY (ARRAY['admin'::"text", 'super_admin'::"text"]))))));
