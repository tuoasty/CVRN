
ALTER TABLE "public"."sheet_configs" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."sheet_sync_logs" ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "anyone can read sheet_configs" ON "public"."sheet_configs";
CREATE POLICY "anyone can read sheet_configs" ON "public"."sheet_configs"
  FOR SELECT TO "authenticated", "anon" USING (true);

DROP POLICY IF EXISTS "admins can insert sheet_configs" ON "public"."sheet_configs";
CREATE POLICY "admins can insert sheet_configs" ON "public"."sheet_configs"
  FOR INSERT TO "authenticated"
  WITH CHECK ((EXISTS ( SELECT 1 FROM "public"."user_roles"
    WHERE (("user_roles"."user_id" = ( SELECT "auth"."uid"() AS "uid"))
      AND ("user_roles"."role" = ANY (ARRAY['admin'::"text", 'super_admin'::"text"]))))));

DROP POLICY IF EXISTS "admins can update sheet_configs" ON "public"."sheet_configs";
CREATE POLICY "admins can update sheet_configs" ON "public"."sheet_configs"
  FOR UPDATE TO "authenticated"
  USING ((EXISTS ( SELECT 1 FROM "public"."user_roles"
    WHERE (("user_roles"."user_id" = ( SELECT "auth"."uid"() AS "uid"))
      AND ("user_roles"."role" = ANY (ARRAY['admin'::"text", 'super_admin'::"text"]))))));

DROP POLICY IF EXISTS "admins can delete sheet_configs" ON "public"."sheet_configs";
CREATE POLICY "admins can delete sheet_configs" ON "public"."sheet_configs"
  FOR DELETE TO "authenticated"
  USING ((EXISTS ( SELECT 1 FROM "public"."user_roles"
    WHERE (("user_roles"."user_id" = ( SELECT "auth"."uid"() AS "uid"))
      AND ("user_roles"."role" = ANY (ARRAY['admin'::"text", 'super_admin'::"text"]))))));

DROP POLICY IF EXISTS "anyone can read sheet_sync_logs" ON "public"."sheet_sync_logs";
CREATE POLICY "anyone can read sheet_sync_logs" ON "public"."sheet_sync_logs"
  FOR SELECT TO "authenticated", "anon" USING (true);

DROP POLICY IF EXISTS "admins can insert sheet_sync_logs" ON "public"."sheet_sync_logs";
CREATE POLICY "admins can insert sheet_sync_logs" ON "public"."sheet_sync_logs"
  FOR INSERT TO "authenticated"
  WITH CHECK ((EXISTS ( SELECT 1 FROM "public"."user_roles"
    WHERE (("user_roles"."user_id" = ( SELECT "auth"."uid"() AS "uid"))
      AND ("user_roles"."role" = ANY (ARRAY['admin'::"text", 'super_admin'::"text"]))))));
