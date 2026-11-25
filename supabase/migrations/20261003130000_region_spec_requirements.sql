ALTER TABLE "public"."spec_requirements" ADD COLUMN "region_id" "uuid";

UPDATE "public"."spec_requirements"
  SET "region_id" = 'c9008fc9-ebf1-4061-9147-cd24f4df3f23';

ALTER TABLE "public"."spec_requirements" ALTER COLUMN "region_id" SET NOT NULL;

ALTER TABLE "public"."spec_requirements"
  ADD CONSTRAINT "spec_requirements_region_id_fkey"
  FOREIGN KEY ("region_id") REFERENCES "public"."regions"("id") ON DELETE CASCADE;

ALTER TABLE "public"."spec_requirements" ALTER COLUMN "min_value" DROP NOT NULL;

ALTER TABLE "public"."spec_requirements"
  DROP CONSTRAINT "spec_requirements_spec_id_stat_key_key";

ALTER TABLE "public"."spec_requirements"
  ADD CONSTRAINT "spec_requirements_spec_id_region_id_stat_key_key"
  UNIQUE ("spec_id", "region_id", "stat_key");

CREATE INDEX "spec_requirements_region_id_spec_id_idx"
  ON "public"."spec_requirements" ("region_id", "spec_id");

CREATE TABLE "public"."spec_region_rules" (
  "spec_id"            "uuid" NOT NULL REFERENCES "public"."specs"("id") ON DELETE CASCADE,
  "region_id"          "uuid" NOT NULL REFERENCES "public"."regions"("id") ON DELETE CASCADE,
  "secondary_required" smallint NOT NULL DEFAULT 0 CHECK ("secondary_required" >= 0),
  "updated_at"         timestamp with time zone NOT NULL DEFAULT "now"(),
  PRIMARY KEY ("spec_id", "region_id")
);

INSERT INTO "public"."spec_region_rules" ("spec_id", "region_id", "secondary_required")
  SELECT "id", 'c9008fc9-ebf1-4061-9147-cd24f4df3f23', "secondary_required"
  FROM "public"."specs";

ALTER TABLE "public"."spec_region_rules" ENABLE ROW LEVEL SECURITY;

CREATE POLICY "admins can read spec_region_rules" ON "public"."spec_region_rules"
  FOR SELECT TO "authenticated"
  USING ((EXISTS ( SELECT 1 FROM "public"."user_roles"
    WHERE (("user_roles"."user_id" = ( SELECT "auth"."uid"() AS "uid"))
      AND ("user_roles"."role" = ANY (ARRAY['admin'::"text", 'super_admin'::"text", 'spec_manager'::"text"]))))));

CREATE POLICY "admins can insert spec_region_rules" ON "public"."spec_region_rules"
  FOR INSERT TO "authenticated"
  WITH CHECK ((EXISTS ( SELECT 1 FROM "public"."user_roles"
    WHERE (("user_roles"."user_id" = ( SELECT "auth"."uid"() AS "uid"))
      AND ("user_roles"."role" = ANY (ARRAY['admin'::"text", 'super_admin'::"text", 'spec_manager'::"text"]))))));

CREATE POLICY "admins can update spec_region_rules" ON "public"."spec_region_rules"
  FOR UPDATE TO "authenticated"
  USING ((EXISTS ( SELECT 1 FROM "public"."user_roles"
    WHERE (("user_roles"."user_id" = ( SELECT "auth"."uid"() AS "uid"))
      AND ("user_roles"."role" = ANY (ARRAY['admin'::"text", 'super_admin'::"text", 'spec_manager'::"text"]))))));

CREATE POLICY "admins can delete spec_region_rules" ON "public"."spec_region_rules"
  FOR DELETE TO "authenticated"
  USING ((EXISTS ( SELECT 1 FROM "public"."user_roles"
    WHERE (("user_roles"."user_id" = ( SELECT "auth"."uid"() AS "uid"))
      AND ("user_roles"."role" = ANY (ARRAY['admin'::"text", 'super_admin'::"text", 'spec_manager'::"text"]))))));

ALTER TABLE "public"."spec_region_rules" OWNER TO "postgres";

GRANT ALL ON TABLE "public"."spec_region_rules" TO "authenticated";
GRANT ALL ON TABLE "public"."spec_region_rules" TO "service_role";

ALTER TABLE "public"."public_spec_snapshot" ADD COLUMN "region_id" "uuid";

UPDATE "public"."public_spec_snapshot"
  SET "region_id" = 'c9008fc9-ebf1-4061-9147-cd24f4df3f23';

ALTER TABLE "public"."public_spec_snapshot" DROP CONSTRAINT "public_spec_snapshot_pkey";
ALTER TABLE "public"."public_spec_snapshot" DROP COLUMN "id";

ALTER TABLE "public"."public_spec_snapshot" ALTER COLUMN "region_id" SET NOT NULL;

ALTER TABLE "public"."public_spec_snapshot"
  ADD CONSTRAINT "public_spec_snapshot_pkey" PRIMARY KEY ("region_id");

ALTER TABLE "public"."public_spec_snapshot"
  ADD CONSTRAINT "public_spec_snapshot_region_id_fkey"
  FOREIGN KEY ("region_id") REFERENCES "public"."regions"("id") ON DELETE CASCADE;

CREATE OR REPLACE FUNCTION "public"."replace_region_spec_requirements"(
  "p_region_id" "uuid",
  "p_specs" "jsonb"
)
RETURNS void
LANGUAGE "plpgsql"
SECURITY INVOKER
SET "search_path" = ''
AS $$
DECLARE
  v_spec jsonb;
  v_spec_id uuid;
BEGIN
  FOR v_spec IN SELECT * FROM jsonb_array_elements(p_specs) LOOP
    v_spec_id := (v_spec->>'spec_id')::uuid;

    DELETE FROM public.spec_requirements
      WHERE spec_id = v_spec_id AND region_id = p_region_id;

    INSERT INTO public.spec_requirements (spec_id, region_id, tier, stat_key, min_value)
      SELECT v_spec_id, p_region_id, r->>'tier', r->>'stat_key', (r->>'min_value')::numeric
      FROM jsonb_array_elements(COALESCE(v_spec->'requirements', '[]'::jsonb)) AS r;

    INSERT INTO public.spec_region_rules (spec_id, region_id, secondary_required, updated_at)
      VALUES (v_spec_id, p_region_id, COALESCE((v_spec->>'secondary_required')::smallint, 0), now())
      ON CONFLICT (spec_id, region_id) DO UPDATE
        SET secondary_required = EXCLUDED.secondary_required,
            updated_at = EXCLUDED.updated_at;
  END LOOP;
END;
$$;

REVOKE ALL ON FUNCTION "public"."replace_region_spec_requirements"("uuid", "jsonb") FROM PUBLIC;
REVOKE ALL ON FUNCTION "public"."replace_region_spec_requirements"("uuid", "jsonb") FROM "anon";
GRANT EXECUTE ON FUNCTION "public"."replace_region_spec_requirements"("uuid", "jsonb") TO "authenticated";
GRANT EXECUTE ON FUNCTION "public"."replace_region_spec_requirements"("uuid", "jsonb") TO "service_role";
