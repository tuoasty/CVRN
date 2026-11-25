CREATE TABLE "public"."cache_versions" (
    "tag"        text        NOT NULL,
    "version"    bigint      NOT NULL DEFAULT 0,
    "updated_at" timestamptz NOT NULL DEFAULT now(),
    CONSTRAINT "cache_versions_pkey" PRIMARY KEY ("tag")
);

ALTER TABLE "public"."cache_versions" ENABLE ROW LEVEL SECURITY;

CREATE POLICY "anyone can read cache_versions" ON "public"."cache_versions"
    FOR SELECT TO "authenticated", "anon" USING (true);

CREATE OR REPLACE FUNCTION "public"."bump_cache_version"("p_tag" "text") RETURNS void
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
begin
  insert into cache_versions (tag)
  values (p_tag)
  on conflict (tag) do update
    set version = cache_versions.version + 1,
        updated_at = now();
end;
$$;

ALTER FUNCTION "public"."bump_cache_version"("p_tag" "text") OWNER TO "postgres";

GRANT EXECUTE ON FUNCTION "public"."bump_cache_version"("p_tag" "text") TO "authenticated";

INSERT INTO "public"."cache_versions" ("tag") VALUES ('stats') ON CONFLICT ("tag") DO NOTHING;
