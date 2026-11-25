CREATE TABLE "public"."game_datasets" (
    "kind"        text        NOT NULL,
    "payload"     jsonb       NOT NULL,
    "source_text" text        NOT NULL,
    "imported_by" uuid        NOT NULL,
    "imported_at" timestamptz NOT NULL DEFAULT now(),
    CONSTRAINT "game_datasets_pkey" PRIMARY KEY ("kind"),
    CONSTRAINT "game_datasets_payload_is_array" CHECK (jsonb_typeof("payload") = 'array'),
    CONSTRAINT "game_datasets_imported_by_fkey" FOREIGN KEY ("imported_by") REFERENCES "auth"."users"("id")
);

ALTER TABLE "public"."game_datasets" ENABLE ROW LEVEL SECURITY;

CREATE POLICY "anyone can read game_datasets" ON "public"."game_datasets"
    FOR SELECT TO "authenticated", "anon" USING (true);

CREATE POLICY "admins can insert game_datasets" ON "public"."game_datasets"
    FOR INSERT TO "authenticated"
    WITH CHECK ((EXISTS (SELECT 1 FROM "public"."user_roles"
        WHERE (("user_roles"."user_id" = (SELECT "auth"."uid"() AS "uid"))
            AND ("user_roles"."role" = ANY (ARRAY['admin'::"text", 'super_admin'::"text"]))))));

CREATE POLICY "admins can update game_datasets" ON "public"."game_datasets"
    FOR UPDATE TO "authenticated"
    USING ((EXISTS (SELECT 1 FROM "public"."user_roles"
        WHERE (("user_roles"."user_id" = (SELECT "auth"."uid"() AS "uid"))
            AND ("user_roles"."role" = ANY (ARRAY['admin'::"text", 'super_admin'::"text"]))))));

CREATE POLICY "admins can delete game_datasets" ON "public"."game_datasets"
    FOR DELETE TO "authenticated"
    USING ((EXISTS (SELECT 1 FROM "public"."user_roles"
        WHERE (("user_roles"."user_id" = (SELECT "auth"."uid"() AS "uid"))
            AND ("user_roles"."role" = ANY (ARRAY['admin'::"text", 'super_admin'::"text"]))))));
