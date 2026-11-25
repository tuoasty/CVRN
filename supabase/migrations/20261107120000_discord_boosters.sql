CREATE TABLE "public"."discord_boosters" (
  "discord_user_id" text PRIMARY KEY,
  "roblox_user_id" text,
  "premium_since" timestamptz,
  "resolved_at" timestamptz,
  "updated_at" timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX "discord_boosters_roblox_user_id_idx" ON "public"."discord_boosters" ("roblox_user_id");

ALTER TABLE "public"."discord_boosters" ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON TABLE "public"."discord_boosters" FROM "anon", "authenticated";
