ALTER TABLE "public"."game_terms" DROP CONSTRAINT "game_terms_kind_check";
ALTER TABLE "public"."game_terms" ADD CONSTRAINT "game_terms_kind_check" CHECK ("kind" IN ('effect', 'param', 'option'));
ALTER TABLE "public"."game_terms" ADD CONSTRAINT "game_terms_option_template" CHECK ("kind" <> 'option' OR "template" IS NOT NULL);

INSERT INTO "public"."game_terms" ("kind", "tag", "category", "label", "unit", "template", "grants", "verified") VALUES
    ('option', 'Mode', 'special', NULL, NULL, '{text} mode only', NULL, true),
    ('option', 'Standing', 'special', NULL, NULL, 'standing jumps', NULL, true),
    ('option', 'ShortBonus', 'special', NULL, NULL, 'stronger on shorter builds and diminishes as builds get taller', NULL, true),
    ('option', 'MaxHeight', 'special', NULL, NULL, 'up to {height}', NULL, true),
    ('option', 'MinHeight', 'special', NULL, NULL, 'from {height}', NULL, true),
    ('option', 'RolledOnly', 'special', NULL, NULL, 'only as your rolled trait', NULL, true),
    ('option', 'AtHeight', 'special', NULL, NULL, 'at {height}', NULL, false),
    ('option', 'Below', 'special', NULL, NULL, 'and below', NULL, false);

CREATE TABLE "public"."game_ability_settings" (
    "ability_key"        text        NOT NULL,
    "description_source" text        NOT NULL DEFAULT 'original',
    "updated_by"         uuid,
    "updated_at"         timestamptz NOT NULL DEFAULT now(),
    CONSTRAINT "game_ability_settings_pkey" PRIMARY KEY ("ability_key"),
    CONSTRAINT "game_ability_settings_source_check" CHECK ("description_source" IN ('original', 'derived')),
    CONSTRAINT "game_ability_settings_updated_by_fkey" FOREIGN KEY ("updated_by") REFERENCES "auth"."users"("id") ON DELETE SET NULL
);

ALTER TABLE "public"."game_ability_settings" ENABLE ROW LEVEL SECURITY;

CREATE POLICY "anyone can read game_ability_settings" ON "public"."game_ability_settings"
    FOR SELECT TO "authenticated", "anon" USING (true);

CREATE POLICY "admins can insert game_ability_settings" ON "public"."game_ability_settings"
    FOR INSERT TO "authenticated"
    WITH CHECK ((EXISTS (SELECT 1 FROM "public"."user_roles"
        WHERE (("user_roles"."user_id" = (SELECT "auth"."uid"() AS "uid"))
            AND ("user_roles"."role" = ANY (ARRAY['admin'::"text", 'super_admin'::"text"]))))));

CREATE POLICY "admins can update game_ability_settings" ON "public"."game_ability_settings"
    FOR UPDATE TO "authenticated"
    USING ((EXISTS (SELECT 1 FROM "public"."user_roles"
        WHERE (("user_roles"."user_id" = (SELECT "auth"."uid"() AS "uid"))
            AND ("user_roles"."role" = ANY (ARRAY['admin'::"text", 'super_admin'::"text"]))))));

CREATE POLICY "admins can delete game_ability_settings" ON "public"."game_ability_settings"
    FOR DELETE TO "authenticated"
    USING ((EXISTS (SELECT 1 FROM "public"."user_roles"
        WHERE (("user_roles"."user_id" = (SELECT "auth"."uid"() AS "uid"))
            AND ("user_roles"."role" = ANY (ARRAY['admin'::"text", 'super_admin'::"text"]))))));
