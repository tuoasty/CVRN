ALTER TABLE "public"."season_awards" ADD COLUMN IF NOT EXISTS "full_avatar_url" text;
ALTER TABLE "public"."season_awards" ADD COLUMN IF NOT EXISTS "full_avatar_synced_at" timestamptz;
ALTER TABLE "public"."players" DROP COLUMN IF EXISTS "full_avatar_url";
