CREATE TABLE "public"."media_posts" (
    "id"           uuid        NOT NULL DEFAULT gen_random_uuid(),
    "type"         text        NOT NULL,
    "title"        text        NOT NULL,
    "description"  text,
    "image_url"    text,
    "video_url"    text,
    "author_id"    uuid,
    "match_id"     uuid,
    "team_id"      uuid,
    "season_id"    uuid,
    "published_at" timestamptz NOT NULL DEFAULT now(),
    "created_by"   uuid        NOT NULL,
    "created_at"   timestamptz NOT NULL DEFAULT now(),
    "updated_at"   timestamptz,
    CONSTRAINT "media_posts_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "media_posts_type_check" CHECK (type IN ('gfx','video','news','recap')),
    CONSTRAINT "media_posts_author_id_fkey" FOREIGN KEY ("author_id") REFERENCES "public"."players"("id"),
    CONSTRAINT "media_posts_match_id_fkey"  FOREIGN KEY ("match_id")  REFERENCES "public"."matches"("id"),
    CONSTRAINT "media_posts_team_id_fkey"   FOREIGN KEY ("team_id")   REFERENCES "public"."teams"("id"),
    CONSTRAINT "media_posts_season_id_fkey" FOREIGN KEY ("season_id") REFERENCES "public"."seasons"("id"),
    CONSTRAINT "media_posts_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "auth"."users"("id")
);

ALTER TABLE "public"."media_posts" ENABLE ROW LEVEL SECURITY;

CREATE POLICY "anyone can read media_posts" ON "public"."media_posts"
    FOR SELECT TO "authenticated", "anon" USING (true);

CREATE POLICY "admins can insert media_posts" ON "public"."media_posts"
    FOR INSERT TO "authenticated"
    WITH CHECK ((EXISTS (SELECT 1 FROM "public"."user_roles"
        WHERE (("user_roles"."user_id" = (SELECT "auth"."uid"() AS "uid"))
            AND ("user_roles"."role" = ANY (ARRAY['admin'::"text", 'super_admin'::"text"]))))));

CREATE POLICY "admins can update media_posts" ON "public"."media_posts"
    FOR UPDATE TO "authenticated"
    USING ((EXISTS (SELECT 1 FROM "public"."user_roles"
        WHERE (("user_roles"."user_id" = (SELECT "auth"."uid"() AS "uid"))
            AND ("user_roles"."role" = ANY (ARRAY['admin'::"text", 'super_admin'::"text"]))))));

CREATE POLICY "admins can delete media_posts" ON "public"."media_posts"
    FOR DELETE TO "authenticated"
    USING ((EXISTS (SELECT 1 FROM "public"."user_roles"
        WHERE (("user_roles"."user_id" = (SELECT "auth"."uid"() AS "uid"))
            AND ("user_roles"."role" = ANY (ARRAY['admin'::"text", 'super_admin'::"text"]))))));
