ALTER TABLE "public"."players"
DROP COLUMN IF EXISTS "full_avatar_url",
DROP COLUMN IF EXISTS "full_avatar_last_synced_at";
