CREATE TABLE "public"."roblox_user_cache" (
    "roblox_user_id" text         PRIMARY KEY CHECK ("roblox_user_id" ~ '^[0-9]+$'),
    "username"       text,
    "display_name"   text,
    "fetched_at"     timestamptz  NOT NULL DEFAULT now()
);

ALTER TABLE "public"."roblox_user_cache" ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON TABLE "public"."roblox_user_cache" FROM "anon";
REVOKE DELETE ON TABLE "public"."roblox_user_cache" FROM "authenticated";

CREATE POLICY "admin select roblox_user_cache" ON "public"."roblox_user_cache"
    FOR SELECT TO "authenticated" USING ((SELECT "public"."has_group"('admin')));
CREATE POLICY "admin insert roblox_user_cache" ON "public"."roblox_user_cache"
    FOR INSERT TO "authenticated" WITH CHECK ((SELECT "public"."has_group"('admin')));
CREATE POLICY "admin update roblox_user_cache" ON "public"."roblox_user_cache"
    FOR UPDATE TO "authenticated"
    USING ((SELECT "public"."has_group"('admin')))
    WITH CHECK ((SELECT "public"."has_group"('admin')));
