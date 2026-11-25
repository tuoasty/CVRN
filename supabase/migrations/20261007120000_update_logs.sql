CREATE TABLE "public"."update_logs" (
    "id"           uuid        NOT NULL DEFAULT gen_random_uuid(),
    "version"      text        NOT NULL,
    "title"        text,
    "body"         text        NOT NULL,
    "released_at"  date        NOT NULL,
    "published_at" timestamptz,
    "created_by"   uuid        NOT NULL,
    "created_at"   timestamptz NOT NULL DEFAULT now(),
    "updated_at"   timestamptz NOT NULL DEFAULT now(),
    CONSTRAINT "update_logs_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "update_logs_version_key" UNIQUE ("version"),
    CONSTRAINT "update_logs_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "auth"."users"("id")
);

CREATE INDEX "update_logs_released_at_idx" ON "public"."update_logs" ("released_at" DESC, "created_at" DESC);

CREATE TABLE "public"."update_log_images" (
    "id"            uuid        NOT NULL DEFAULT gen_random_uuid(),
    "update_log_id" uuid        NOT NULL,
    "handle"        text        NOT NULL,
    "storage_path"  text        NOT NULL,
    "url"           text        NOT NULL,
    "created_at"    timestamptz NOT NULL DEFAULT now(),
    CONSTRAINT "update_log_images_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "update_log_images_log_handle_key" UNIQUE ("update_log_id", "handle"),
    CONSTRAINT "update_log_images_update_log_id_fkey" FOREIGN KEY ("update_log_id") REFERENCES "public"."update_logs"("id") ON DELETE CASCADE
);

ALTER TABLE "public"."update_logs" ENABLE ROW LEVEL SECURITY;

CREATE POLICY "anyone can read published update_logs" ON "public"."update_logs"
    FOR SELECT TO "authenticated", "anon" USING ("published_at" IS NOT NULL);

CREATE POLICY "admins can read all update_logs" ON "public"."update_logs"
    FOR SELECT TO "authenticated"
    USING ((EXISTS (SELECT 1 FROM "public"."user_roles"
        WHERE (("user_roles"."user_id" = (SELECT "auth"."uid"() AS "uid"))
            AND ("user_roles"."role" = ANY (ARRAY['admin'::"text", 'super_admin'::"text"]))))));

CREATE POLICY "admins can insert update_logs" ON "public"."update_logs"
    FOR INSERT TO "authenticated"
    WITH CHECK ((EXISTS (SELECT 1 FROM "public"."user_roles"
        WHERE (("user_roles"."user_id" = (SELECT "auth"."uid"() AS "uid"))
            AND ("user_roles"."role" = ANY (ARRAY['admin'::"text", 'super_admin'::"text"]))))));

CREATE POLICY "admins can update update_logs" ON "public"."update_logs"
    FOR UPDATE TO "authenticated"
    USING ((EXISTS (SELECT 1 FROM "public"."user_roles"
        WHERE (("user_roles"."user_id" = (SELECT "auth"."uid"() AS "uid"))
            AND ("user_roles"."role" = ANY (ARRAY['admin'::"text", 'super_admin'::"text"]))))));

CREATE POLICY "admins can delete update_logs" ON "public"."update_logs"
    FOR DELETE TO "authenticated"
    USING ((EXISTS (SELECT 1 FROM "public"."user_roles"
        WHERE (("user_roles"."user_id" = (SELECT "auth"."uid"() AS "uid"))
            AND ("user_roles"."role" = ANY (ARRAY['admin'::"text", 'super_admin'::"text"]))))));

ALTER TABLE "public"."update_log_images" ENABLE ROW LEVEL SECURITY;

CREATE POLICY "anyone can read images of published update_logs" ON "public"."update_log_images"
    FOR SELECT TO "authenticated", "anon"
    USING ((EXISTS (SELECT 1 FROM "public"."update_logs"
        WHERE (("update_logs"."id" = "update_log_images"."update_log_id")
            AND ("update_logs"."published_at" IS NOT NULL)))));

CREATE POLICY "admins can read all update_log_images" ON "public"."update_log_images"
    FOR SELECT TO "authenticated"
    USING ((EXISTS (SELECT 1 FROM "public"."user_roles"
        WHERE (("user_roles"."user_id" = (SELECT "auth"."uid"() AS "uid"))
            AND ("user_roles"."role" = ANY (ARRAY['admin'::"text", 'super_admin'::"text"]))))));

CREATE POLICY "admins can insert update_log_images" ON "public"."update_log_images"
    FOR INSERT TO "authenticated"
    WITH CHECK ((EXISTS (SELECT 1 FROM "public"."user_roles"
        WHERE (("user_roles"."user_id" = (SELECT "auth"."uid"() AS "uid"))
            AND ("user_roles"."role" = ANY (ARRAY['admin'::"text", 'super_admin'::"text"]))))));

CREATE POLICY "admins can update update_log_images" ON "public"."update_log_images"
    FOR UPDATE TO "authenticated"
    USING ((EXISTS (SELECT 1 FROM "public"."user_roles"
        WHERE (("user_roles"."user_id" = (SELECT "auth"."uid"() AS "uid"))
            AND ("user_roles"."role" = ANY (ARRAY['admin'::"text", 'super_admin'::"text"]))))));

CREATE POLICY "admins can delete update_log_images" ON "public"."update_log_images"
    FOR DELETE TO "authenticated"
    USING ((EXISTS (SELECT 1 FROM "public"."user_roles"
        WHERE (("user_roles"."user_id" = (SELECT "auth"."uid"() AS "uid"))
            AND ("user_roles"."role" = ANY (ARRAY['admin'::"text", 'super_admin'::"text"]))))));
