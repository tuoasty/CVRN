CREATE TABLE "public"."public_spec_snapshot" (
  "id"           smallint PRIMARY KEY DEFAULT 1 CHECK ("id" = 1),
  "payload"      "jsonb" NOT NULL,
  "generated_at" timestamp with time zone NOT NULL DEFAULT "now"(),
  "pool_size"    integer NOT NULL DEFAULT 0
);

ALTER TABLE "public"."public_spec_snapshot" ENABLE ROW LEVEL SECURITY;

CREATE POLICY "anyone can read spec snapshot" ON "public"."public_spec_snapshot"
  FOR SELECT TO "authenticated", "anon" USING (true);

CREATE POLICY "spec managers can upsert spec snapshot" ON "public"."public_spec_snapshot"
  FOR ALL TO "authenticated"
  USING ((EXISTS ( SELECT 1 FROM "public"."user_roles"
    WHERE (("user_roles"."user_id" = ( SELECT "auth"."uid"() AS "uid"))
      AND ("user_roles"."role" = ANY (ARRAY['admin'::"text", 'super_admin'::"text", 'spec_manager'::"text"]))))))
  WITH CHECK ((EXISTS ( SELECT 1 FROM "public"."user_roles"
    WHERE (("user_roles"."user_id" = ( SELECT "auth"."uid"() AS "uid"))
      AND ("user_roles"."role" = ANY (ARRAY['admin'::"text", 'super_admin'::"text", 'spec_manager'::"text"]))))));

ALTER TABLE "public"."public_spec_snapshot" OWNER TO "postgres";

GRANT ALL ON TABLE "public"."public_spec_snapshot" TO "anon";
GRANT ALL ON TABLE "public"."public_spec_snapshot" TO "authenticated";
GRANT ALL ON TABLE "public"."public_spec_snapshot" TO "service_role";
