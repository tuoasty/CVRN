CREATE TABLE "public"."player_card_overlays" (
    "id"            uuid        NOT NULL DEFAULT gen_random_uuid(),
    "player_id"     uuid        NOT NULL,
    "season_number" integer     NOT NULL,
    "group_id"      uuid        NOT NULL,
    "slot"          text        NOT NULL,
    "image_path"    text        NOT NULL,
    "image_url"     text        NOT NULL,
    "width"         integer     NOT NULL,
    "height"        integer     NOT NULL,
    "uploaded_by"   uuid        DEFAULT auth.uid(),
    "uploaded_at"   timestamptz NOT NULL DEFAULT now(),
    CONSTRAINT "player_card_overlays_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "player_card_overlays_player_season_group_slot_key" UNIQUE ("player_id", "season_number", "group_id", "slot"),
    CONSTRAINT "player_card_overlays_player_id_fkey" FOREIGN KEY ("player_id") REFERENCES "public"."players"("id") ON DELETE CASCADE,
    CONSTRAINT "player_card_overlays_group_id_fkey" FOREIGN KEY ("group_id") REFERENCES "public"."card_groups"("id") ON DELETE RESTRICT,
    CONSTRAINT "player_card_overlays_uploaded_by_fkey" FOREIGN KEY ("uploaded_by") REFERENCES "auth"."users"("id") ON DELETE SET NULL,
    CONSTRAINT "player_card_overlays_slot_check" CHECK ("slot" = ANY (ARRAY['rig'::text])),
    CONSTRAINT "player_card_overlays_size_check" CHECK ("width" > 0 AND "height" > 0)
);

CREATE INDEX "player_card_overlays_group_id_idx" ON "public"."player_card_overlays" ("group_id");

ALTER TABLE "public"."player_card_overlays" ENABLE ROW LEVEL SECURITY;

CREATE POLICY "anyone can read player_card_overlays" ON "public"."player_card_overlays"
    FOR SELECT TO "authenticated", "anon" USING (true);

CREATE POLICY "admins can insert player_card_overlays" ON "public"."player_card_overlays"
    FOR INSERT TO "authenticated"
    WITH CHECK ((EXISTS (SELECT 1 FROM "public"."user_roles"
        WHERE (("user_roles"."user_id" = (SELECT "auth"."uid"() AS "uid"))
            AND ("user_roles"."role" = ANY (ARRAY['admin'::"text", 'super_admin'::"text"]))))));

CREATE POLICY "admins can update player_card_overlays" ON "public"."player_card_overlays"
    FOR UPDATE TO "authenticated"
    USING ((EXISTS (SELECT 1 FROM "public"."user_roles"
        WHERE (("user_roles"."user_id" = (SELECT "auth"."uid"() AS "uid"))
            AND ("user_roles"."role" = ANY (ARRAY['admin'::"text", 'super_admin'::"text"]))))));

CREATE POLICY "admins can delete player_card_overlays" ON "public"."player_card_overlays"
    FOR DELETE TO "authenticated"
    USING ((EXISTS (SELECT 1 FROM "public"."user_roles"
        WHERE (("user_roles"."user_id" = (SELECT "auth"."uid"() AS "uid"))
            AND ("user_roles"."role" = ANY (ARRAY['admin'::"text", 'super_admin'::"text"]))))));
