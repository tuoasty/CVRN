CREATE TABLE "public"."spec_bonuses" (
  "region_id"      "uuid" PRIMARY KEY REFERENCES "public"."regions"("id") ON DELETE CASCADE,
  "upper_finalist" double precision NOT NULL DEFAULT 0.25,
  "ladder"         double precision[] NOT NULL DEFAULT ARRAY[0.10, 0.075, 0.05, 0.025, 0, 0, 0, 0]::double precision[]
                     CHECK ("array_length"("ladder", 1) = 8),
  "outside"        double precision NOT NULL DEFAULT -0.10,
  "updated_at"     timestamp with time zone NOT NULL DEFAULT "now"()
);

ALTER TABLE "public"."spec_bonuses" ENABLE ROW LEVEL SECURITY;

CREATE POLICY "spec managers can manage spec bonuses" ON "public"."spec_bonuses"
  FOR ALL TO "authenticated"
  USING ((EXISTS ( SELECT 1 FROM "public"."user_roles"
    WHERE (("user_roles"."user_id" = ( SELECT "auth"."uid"() AS "uid"))
      AND ("user_roles"."role" = ANY (ARRAY['admin'::"text", 'super_admin'::"text", 'spec_manager'::"text"]))))))
  WITH CHECK ((EXISTS ( SELECT 1 FROM "public"."user_roles"
    WHERE (("user_roles"."user_id" = ( SELECT "auth"."uid"() AS "uid"))
      AND ("user_roles"."role" = ANY (ARRAY['admin'::"text", 'super_admin'::"text", 'spec_manager'::"text"]))))));

ALTER TABLE "public"."spec_bonuses" OWNER TO "postgres";

GRANT ALL ON TABLE "public"."spec_bonuses" TO "anon";
GRANT ALL ON TABLE "public"."spec_bonuses" TO "authenticated";
GRANT ALL ON TABLE "public"."spec_bonuses" TO "service_role";
