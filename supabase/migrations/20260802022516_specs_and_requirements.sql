
CREATE TABLE "public"."specs" (
  "id"                 "uuid" PRIMARY KEY DEFAULT "gen_random_uuid"(),
  "name"               "text" NOT NULL UNIQUE,
  "stars"              smallint NOT NULL CHECK ("stars" BETWEEN 3 AND 5),

  "secondary_required" smallint NOT NULL DEFAULT 3 CHECK ("secondary_required" >= 0),

  "created_at"         timestamp with time zone NOT NULL DEFAULT "now"(),
  "updated_at"         timestamp with time zone NOT NULL DEFAULT "now"()
);

CREATE TABLE "public"."spec_requirements" (
  "id"         "uuid" PRIMARY KEY DEFAULT "gen_random_uuid"(),
  "spec_id"    "uuid" NOT NULL REFERENCES "public"."specs"("id") ON DELETE CASCADE,
  "tier"       "text" NOT NULL CHECK ("tier" IN ('main', 'secondary')),

  "stat_key"   "text" NOT NULL,
  "min_value"  numeric NOT NULL,
  "created_at" timestamp with time zone NOT NULL DEFAULT "now"(),

  UNIQUE ("spec_id", "stat_key")
);

CREATE INDEX "spec_requirements_spec_id_idx" ON "public"."spec_requirements" ("spec_id");

ALTER TABLE "public"."specs" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."spec_requirements" ENABLE ROW LEVEL SECURITY;

CREATE POLICY "anyone can read specs" ON "public"."specs"
  FOR SELECT TO "authenticated", "anon" USING (true);

CREATE POLICY "admins can insert specs" ON "public"."specs"
  FOR INSERT TO "authenticated"
  WITH CHECK ((EXISTS ( SELECT 1 FROM "public"."user_roles"
    WHERE (("user_roles"."user_id" = ( SELECT "auth"."uid"() AS "uid"))
      AND ("user_roles"."role" = ANY (ARRAY['admin'::"text", 'super_admin'::"text"]))))));

CREATE POLICY "admins can update specs" ON "public"."specs"
  FOR UPDATE TO "authenticated"
  USING ((EXISTS ( SELECT 1 FROM "public"."user_roles"
    WHERE (("user_roles"."user_id" = ( SELECT "auth"."uid"() AS "uid"))
      AND ("user_roles"."role" = ANY (ARRAY['admin'::"text", 'super_admin'::"text"]))))));

CREATE POLICY "admins can delete specs" ON "public"."specs"
  FOR DELETE TO "authenticated"
  USING ((EXISTS ( SELECT 1 FROM "public"."user_roles"
    WHERE (("user_roles"."user_id" = ( SELECT "auth"."uid"() AS "uid"))
      AND ("user_roles"."role" = ANY (ARRAY['admin'::"text", 'super_admin'::"text"]))))));

CREATE POLICY "admins can read spec_requirements" ON "public"."spec_requirements"
  FOR SELECT TO "authenticated"
  USING ((EXISTS ( SELECT 1 FROM "public"."user_roles"
    WHERE (("user_roles"."user_id" = ( SELECT "auth"."uid"() AS "uid"))
      AND ("user_roles"."role" = ANY (ARRAY['admin'::"text", 'super_admin'::"text"]))))));

CREATE POLICY "admins can insert spec_requirements" ON "public"."spec_requirements"
  FOR INSERT TO "authenticated"
  WITH CHECK ((EXISTS ( SELECT 1 FROM "public"."user_roles"
    WHERE (("user_roles"."user_id" = ( SELECT "auth"."uid"() AS "uid"))
      AND ("user_roles"."role" = ANY (ARRAY['admin'::"text", 'super_admin'::"text"]))))));

CREATE POLICY "admins can update spec_requirements" ON "public"."spec_requirements"
  FOR UPDATE TO "authenticated"
  USING ((EXISTS ( SELECT 1 FROM "public"."user_roles"
    WHERE (("user_roles"."user_id" = ( SELECT "auth"."uid"() AS "uid"))
      AND ("user_roles"."role" = ANY (ARRAY['admin'::"text", 'super_admin'::"text"]))))));

CREATE POLICY "admins can delete spec_requirements" ON "public"."spec_requirements"
  FOR DELETE TO "authenticated"
  USING ((EXISTS ( SELECT 1 FROM "public"."user_roles"
    WHERE (("user_roles"."user_id" = ( SELECT "auth"."uid"() AS "uid"))
      AND ("user_roles"."role" = ANY (ARRAY['admin'::"text", 'super_admin'::"text"]))))));

ALTER TABLE "public"."specs" OWNER TO "postgres";
ALTER TABLE "public"."spec_requirements" OWNER TO "postgres";

GRANT ALL ON TABLE "public"."specs" TO "anon";
GRANT ALL ON TABLE "public"."specs" TO "authenticated";
GRANT ALL ON TABLE "public"."specs" TO "service_role";

GRANT ALL ON TABLE "public"."spec_requirements" TO "authenticated";
GRANT ALL ON TABLE "public"."spec_requirements" TO "service_role";
