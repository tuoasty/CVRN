ALTER TABLE "public"."players"
    ADD COLUMN IF NOT EXISTS "full_avatar_url" text DEFAULT NULL;
