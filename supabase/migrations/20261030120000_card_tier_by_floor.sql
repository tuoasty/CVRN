ALTER TABLE "public"."card_templates" DROP COLUMN "tier";

ALTER TABLE "public"."card_templates"
    ADD CONSTRAINT "card_templates_group_min_ovr_key" UNIQUE ("group_id", "min_ovr");

ALTER TABLE "public"."card_groups" DROP COLUMN "slug";
