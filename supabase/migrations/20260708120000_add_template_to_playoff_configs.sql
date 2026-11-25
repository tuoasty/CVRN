
ALTER TABLE "public"."playoff_configs"
    ADD COLUMN IF NOT EXISTS "template" text;
