CREATE TABLE "public"."card_templates" (
    "id"            uuid        NOT NULL DEFAULT gen_random_uuid(),
    "name"          text        NOT NULL,
    "canvas_width"  integer     NOT NULL,
    "canvas_height" integer     NOT NULL,
    "layers"        jsonb       NOT NULL DEFAULT '[]'::jsonb,
    "fonts"         jsonb       NOT NULL DEFAULT '[]'::jsonb,
    "is_active"     boolean     NOT NULL DEFAULT true,
    "created_at"    timestamptz NOT NULL DEFAULT now(),
    CONSTRAINT "card_templates_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "card_templates_canvas_check" CHECK ("canvas_width" > 0 AND "canvas_height" > 0),
    CONSTRAINT "card_templates_layers_array_check" CHECK (jsonb_typeof("layers") = 'array'),
    CONSTRAINT "card_templates_fonts_array_check" CHECK (jsonb_typeof("fonts") = 'array')
);

CREATE TABLE "public"."player_cards" (
    "id"            uuid        NOT NULL DEFAULT gen_random_uuid(),
    "player_id"     uuid        NOT NULL,
    "season_number" integer     NOT NULL,
    "template_id"   uuid        NOT NULL,
    "ovr"           integer     NOT NULL,
    "scoring"       integer     NOT NULL,
    "spiking"       integer     NOT NULL,
    "setting"       integer     NOT NULL,
    "blocking"      integer     NOT NULL,
    "receiving"     integer     NOT NULL,
    "serving"       integer     NOT NULL,
    "position"      text,
    "team_id"       uuid,
    "image_path"    text        NOT NULL,
    "image_url"     text        NOT NULL,
    "generated_at"  timestamptz NOT NULL DEFAULT now(),
    "generated_by"  uuid        DEFAULT auth.uid(),
    CONSTRAINT "player_cards_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "player_cards_player_season_key" UNIQUE ("player_id", "season_number"),
    CONSTRAINT "player_cards_player_id_fkey" FOREIGN KEY ("player_id") REFERENCES "public"."players"("id") ON DELETE CASCADE,
    CONSTRAINT "player_cards_template_id_fkey" FOREIGN KEY ("template_id") REFERENCES "public"."card_templates"("id") ON DELETE RESTRICT,
    CONSTRAINT "player_cards_team_id_fkey" FOREIGN KEY ("team_id") REFERENCES "public"."teams"("id") ON DELETE SET NULL,
    CONSTRAINT "player_cards_generated_by_fkey" FOREIGN KEY ("generated_by") REFERENCES "auth"."users"("id") ON DELETE SET NULL,
    CONSTRAINT "player_cards_ovr_check" CHECK ("ovr" BETWEEN 1 AND 99),
    CONSTRAINT "player_cards_position_check" CHECK ("position" IS NULL OR "position" = ANY (ARRAY['OUT'::text, 'OPP'::text, 'MID'::text, 'SET'::text, 'LIB'::text]))
);

CREATE INDEX "player_cards_season_number_idx" ON "public"."player_cards" ("season_number");
CREATE INDEX "player_cards_template_id_idx" ON "public"."player_cards" ("template_id");

ALTER TABLE "public"."card_templates" ENABLE ROW LEVEL SECURITY;

CREATE POLICY "anyone can read card_templates" ON "public"."card_templates"
    FOR SELECT TO "authenticated", "anon" USING (true);

CREATE POLICY "admins can insert card_templates" ON "public"."card_templates"
    FOR INSERT TO "authenticated"
    WITH CHECK ((EXISTS (SELECT 1 FROM "public"."user_roles"
        WHERE (("user_roles"."user_id" = (SELECT "auth"."uid"() AS "uid"))
            AND ("user_roles"."role" = ANY (ARRAY['admin'::"text", 'super_admin'::"text"]))))));

CREATE POLICY "admins can update card_templates" ON "public"."card_templates"
    FOR UPDATE TO "authenticated"
    USING ((EXISTS (SELECT 1 FROM "public"."user_roles"
        WHERE (("user_roles"."user_id" = (SELECT "auth"."uid"() AS "uid"))
            AND ("user_roles"."role" = ANY (ARRAY['admin'::"text", 'super_admin'::"text"]))))));

CREATE POLICY "super admins can delete card_templates" ON "public"."card_templates"
    FOR DELETE TO "authenticated"
    USING ((EXISTS (SELECT 1 FROM "public"."user_roles"
        WHERE (("user_roles"."user_id" = (SELECT "auth"."uid"() AS "uid"))
            AND ("user_roles"."role" = 'super_admin'::"text")))));

ALTER TABLE "public"."player_cards" ENABLE ROW LEVEL SECURITY;

CREATE POLICY "anyone can read player_cards" ON "public"."player_cards"
    FOR SELECT TO "authenticated", "anon" USING (true);

CREATE POLICY "admins can insert player_cards" ON "public"."player_cards"
    FOR INSERT TO "authenticated"
    WITH CHECK ((EXISTS (SELECT 1 FROM "public"."user_roles"
        WHERE (("user_roles"."user_id" = (SELECT "auth"."uid"() AS "uid"))
            AND ("user_roles"."role" = ANY (ARRAY['admin'::"text", 'super_admin'::"text"]))))));

CREATE POLICY "admins can update player_cards" ON "public"."player_cards"
    FOR UPDATE TO "authenticated"
    USING ((EXISTS (SELECT 1 FROM "public"."user_roles"
        WHERE (("user_roles"."user_id" = (SELECT "auth"."uid"() AS "uid"))
            AND ("user_roles"."role" = ANY (ARRAY['admin'::"text", 'super_admin'::"text"]))))));

CREATE POLICY "admins can delete player_cards" ON "public"."player_cards"
    FOR DELETE TO "authenticated"
    USING ((EXISTS (SELECT 1 FROM "public"."user_roles"
        WHERE (("user_roles"."user_id" = (SELECT "auth"."uid"() AS "uid"))
            AND ("user_roles"."role" = ANY (ARRAY['admin'::"text", 'super_admin'::"text"]))))));
