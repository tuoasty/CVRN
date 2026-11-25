CREATE TABLE "public"."card_groups" (
    "id"         uuid        NOT NULL DEFAULT gen_random_uuid(),
    "slug"       text        NOT NULL,
    "name"       text        NOT NULL,
    "is_limited" boolean     NOT NULL DEFAULT false,
    "is_active"  boolean     NOT NULL DEFAULT true,
    "sort_order" integer     NOT NULL DEFAULT 0,
    "created_at" timestamptz NOT NULL DEFAULT now(),
    CONSTRAINT "card_groups_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "card_groups_slug_key" UNIQUE ("slug"),
    CONSTRAINT "card_groups_slug_check" CHECK ("slug" ~ '^[a-z0-9]+(-[a-z0-9]+)*$')
);

INSERT INTO "public"."card_groups" ("slug", "name")
SELECT 'base', 'Base'
WHERE EXISTS (SELECT 1 FROM "public"."card_templates");

ALTER TABLE "public"."card_templates"
    ADD COLUMN "group_id" uuid,
    ADD COLUMN "tier"     integer,
    ADD COLUMN "min_ovr"  integer;

UPDATE "public"."card_templates" t
SET "group_id" = g.id,
    "tier"     = r.tier,
    "min_ovr"  = 1
FROM "public"."card_groups" g,
     (SELECT id, row_number() OVER (ORDER BY created_at) AS tier FROM "public"."card_templates") r
WHERE g.slug = 'base' AND r.id = t.id;

ALTER TABLE "public"."card_templates"
    ALTER COLUMN "group_id" SET NOT NULL,
    ALTER COLUMN "tier"     SET NOT NULL,
    ALTER COLUMN "min_ovr"  SET NOT NULL,
    DROP COLUMN "is_active",
    ADD CONSTRAINT "card_templates_group_id_fkey" FOREIGN KEY ("group_id") REFERENCES "public"."card_groups"("id") ON DELETE RESTRICT,
    ADD CONSTRAINT "card_templates_group_tier_key" UNIQUE ("group_id", "tier"),
    ADD CONSTRAINT "card_templates_tier_check" CHECK ("tier" >= 1),
    ADD CONSTRAINT "card_templates_min_ovr_check" CHECK ("min_ovr" BETWEEN 1 AND 99);

ALTER TABLE "public"."player_cards" ADD COLUMN "group_id" uuid;

UPDATE "public"."player_cards" pc
SET "group_id" = t.group_id
FROM "public"."card_templates" t
WHERE t.id = pc.template_id;

ALTER TABLE "public"."player_cards"
    ALTER COLUMN "group_id" SET NOT NULL,
    DROP CONSTRAINT "player_cards_player_season_key",
    ADD CONSTRAINT "player_cards_group_id_fkey" FOREIGN KEY ("group_id") REFERENCES "public"."card_groups"("id") ON DELETE RESTRICT,
    ADD CONSTRAINT "player_cards_player_season_group_key" UNIQUE ("player_id", "season_number", "group_id");

CREATE INDEX "player_cards_group_id_idx" ON "public"."player_cards" ("group_id");

ALTER TABLE "public"."card_groups" ENABLE ROW LEVEL SECURITY;

CREATE POLICY "anyone can read card_groups" ON "public"."card_groups"
    FOR SELECT TO "authenticated", "anon" USING (true);

CREATE POLICY "admins can insert card_groups" ON "public"."card_groups"
    FOR INSERT TO "authenticated"
    WITH CHECK ((EXISTS (SELECT 1 FROM "public"."user_roles"
        WHERE (("user_roles"."user_id" = (SELECT "auth"."uid"() AS "uid"))
            AND ("user_roles"."role" = ANY (ARRAY['admin'::"text", 'super_admin'::"text"]))))));

CREATE POLICY "admins can update card_groups" ON "public"."card_groups"
    FOR UPDATE TO "authenticated"
    USING ((EXISTS (SELECT 1 FROM "public"."user_roles"
        WHERE (("user_roles"."user_id" = (SELECT "auth"."uid"() AS "uid"))
            AND ("user_roles"."role" = ANY (ARRAY['admin'::"text", 'super_admin'::"text"]))))));

CREATE POLICY "super admins can delete card_groups" ON "public"."card_groups"
    FOR DELETE TO "authenticated"
    USING ((EXISTS (SELECT 1 FROM "public"."user_roles"
        WHERE (("user_roles"."user_id" = (SELECT "auth"."uid"() AS "uid"))
            AND ("user_roles"."role" = 'super_admin'::"text")))));
