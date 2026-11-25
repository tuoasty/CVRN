CREATE TYPE "public"."access_group" AS ENUM (
    'super_admin',
    'admin',
    'transaction',
    'graphics',
    'media',
    'articles',
    'information',
    'statistics',
    'specs',
    'player_cards',
    'awards'
);

CREATE TABLE "public"."user_accounts" (
    "user_id"              uuid        PRIMARY KEY REFERENCES "auth"."users"("id") ON DELETE CASCADE,
    "discord_user_id"      text        NOT NULL UNIQUE,
    "discord_username"     text,
    "discord_display_name" text,
    "discord_avatar_url"   text,
    "role_ids"             text[]      NOT NULL DEFAULT '{}',
    "roles_valid_until"    timestamptz,
    "roles_verified_at"    timestamptz,
    "created_at"           timestamptz NOT NULL DEFAULT now(),
    "updated_at"           timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE "public"."discord_role_groups" (
    "role_id"    text                  NOT NULL,
    "group_name" "public"."access_group" NOT NULL,
    "updated_by" uuid                  REFERENCES "auth"."users"("id") ON DELETE SET NULL,
    "updated_at" timestamptz           NOT NULL DEFAULT now(),
    PRIMARY KEY ("role_id", "group_name")
);

CREATE TABLE "public"."user_group_blocks" (
    "user_id"    uuid                  NOT NULL REFERENCES "auth"."users"("id") ON DELETE CASCADE,
    "group_name" "public"."access_group",
    "blocked_by" uuid                  REFERENCES "auth"."users"("id") ON DELETE SET NULL,
    "blocked_at" timestamptz           NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX "user_group_blocks_user_group_key"
    ON "public"."user_group_blocks" ("user_id", "group_name")
    WHERE "group_name" IS NOT NULL;

CREATE UNIQUE INDEX "user_group_blocks_user_all_key"
    ON "public"."user_group_blocks" ("user_id")
    WHERE "group_name" IS NULL;

CREATE OR REPLACE FUNCTION "public"."current_groups"() RETURNS "public"."access_group"[]
    LANGUAGE sql STABLE SECURITY DEFINER
    SET "search_path" = ''
    AS $$
SELECT CASE
  WHEN EXISTS (
    SELECT 1 FROM auth.identities i
    WHERE i.user_id = auth.uid()
      AND i.provider = 'discord'
      AND i.provider_id = '365390125602963467'
  ) THEN enum_range(NULL::public.access_group)
  WHEN EXISTS (
    SELECT 1 FROM public.user_group_blocks b
    WHERE b.user_id = auth.uid() AND b.group_name IS NULL
  ) THEN '{}'::public.access_group[]
  ELSE COALESCE((
    SELECT array_agg(DISTINCT m.group_name)
    FROM public.user_accounts a
    JOIN public.discord_role_groups m ON m.role_id = ANY (a.role_ids)
    WHERE a.user_id = auth.uid()
      AND a.roles_valid_until > now()
      AND NOT EXISTS (
        SELECT 1 FROM public.user_group_blocks b
        WHERE b.user_id = a.user_id AND b.group_name = m.group_name
      )
  ), '{}'::public.access_group[])
END
$$;

CREATE OR REPLACE FUNCTION "public"."has_group"("g" "public"."access_group") RETURNS boolean
    LANGUAGE sql STABLE SECURITY DEFINER
    SET "search_path" = ''
    AS $$
SELECT g = ANY (public.current_groups()) OR 'super_admin' = ANY (public.current_groups())
$$;

CREATE OR REPLACE FUNCTION "public"."has_any_group"("gs" "public"."access_group"[]) RETURNS boolean
    LANGUAGE sql STABLE SECURITY DEFINER
    SET "search_path" = ''
    AS $$
SELECT public.current_groups() && gs OR 'super_admin' = ANY (public.current_groups())
$$;

ALTER FUNCTION "public"."current_groups"() OWNER TO "postgres";
ALTER FUNCTION "public"."has_group"("public"."access_group") OWNER TO "postgres";
ALTER FUNCTION "public"."has_any_group"("public"."access_group"[]) OWNER TO "postgres";

REVOKE EXECUTE ON FUNCTION "public"."current_groups"() FROM "anon", "public";
REVOKE EXECUTE ON FUNCTION "public"."has_group"("public"."access_group") FROM "anon", "public";
REVOKE EXECUTE ON FUNCTION "public"."has_any_group"("public"."access_group"[]) FROM "anon", "public";
GRANT EXECUTE ON FUNCTION "public"."current_groups"() TO "authenticated", "service_role";
GRANT EXECUTE ON FUNCTION "public"."has_group"("public"."access_group") TO "authenticated", "service_role";
GRANT EXECUTE ON FUNCTION "public"."has_any_group"("public"."access_group"[]) TO "authenticated", "service_role";

ALTER TABLE "public"."user_accounts" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."discord_role_groups" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."user_group_blocks" ENABLE ROW LEVEL SECURITY;

CREATE POLICY "own row or super_admin can read user_accounts" ON "public"."user_accounts"
    FOR SELECT TO "authenticated"
    USING ("user_id" = (SELECT "auth"."uid"()) OR (SELECT "public"."has_group"('super_admin')));

CREATE POLICY "super_admin can read discord_role_groups" ON "public"."discord_role_groups"
    FOR SELECT TO "authenticated" USING ((SELECT "public"."has_group"('super_admin')));
CREATE POLICY "super_admin can insert discord_role_groups" ON "public"."discord_role_groups"
    FOR INSERT TO "authenticated" WITH CHECK ((SELECT "public"."has_group"('super_admin')));
CREATE POLICY "super_admin can update discord_role_groups" ON "public"."discord_role_groups"
    FOR UPDATE TO "authenticated" USING ((SELECT "public"."has_group"('super_admin')))
    WITH CHECK ((SELECT "public"."has_group"('super_admin')));
CREATE POLICY "super_admin can delete discord_role_groups" ON "public"."discord_role_groups"
    FOR DELETE TO "authenticated" USING ((SELECT "public"."has_group"('super_admin')));

CREATE POLICY "super_admin can read user_group_blocks" ON "public"."user_group_blocks"
    FOR SELECT TO "authenticated" USING ((SELECT "public"."has_group"('super_admin')));
CREATE POLICY "super_admin can insert user_group_blocks" ON "public"."user_group_blocks"
    FOR INSERT TO "authenticated" WITH CHECK ((SELECT "public"."has_group"('super_admin')));
CREATE POLICY "super_admin can update user_group_blocks" ON "public"."user_group_blocks"
    FOR UPDATE TO "authenticated" USING ((SELECT "public"."has_group"('super_admin')))
    WITH CHECK ((SELECT "public"."has_group"('super_admin')));
CREATE POLICY "super_admin can delete user_group_blocks" ON "public"."user_group_blocks"
    FOR DELETE TO "authenticated" USING ((SELECT "public"."has_group"('super_admin')));

REVOKE INSERT, UPDATE, DELETE ON "public"."user_accounts" FROM "anon", "authenticated";
