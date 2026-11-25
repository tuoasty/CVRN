
DROP POLICY IF EXISTS "admins can delete regions" ON "public"."regions";
CREATE POLICY "super_admins can delete regions" ON "public"."regions"
  FOR DELETE TO "authenticated"
  USING ((EXISTS ( SELECT 1 FROM "public"."user_roles"
    WHERE (("user_roles"."user_id" = "auth"."uid"())
      AND ("user_roles"."role" = 'super_admin'::"text")))));

DROP POLICY IF EXISTS "admins can delete seasons" ON "public"."seasons";
CREATE POLICY "super_admins can delete seasons" ON "public"."seasons"
  FOR DELETE TO "authenticated"
  USING ((EXISTS ( SELECT 1 FROM "public"."user_roles"
    WHERE (("user_roles"."user_id" = ( SELECT "auth"."uid"() AS "uid"))
      AND ("user_roles"."role" = 'super_admin'::"text")))));

DROP POLICY IF EXISTS "admins can delete teams" ON "public"."teams";
CREATE POLICY "super_admins can delete teams" ON "public"."teams"
  FOR DELETE TO "authenticated"
  USING ((EXISTS ( SELECT 1 FROM "public"."user_roles"
    WHERE (("user_roles"."user_id" = ( SELECT "auth"."uid"() AS "uid"))
      AND ("user_roles"."role" = 'super_admin'::"text")))));

DROP POLICY IF EXISTS "admins can delete players" ON "public"."players";
CREATE POLICY "super_admins can delete players" ON "public"."players"
  FOR DELETE TO "authenticated"
  USING ((EXISTS ( SELECT 1 FROM "public"."user_roles"
    WHERE (("user_roles"."user_id" = ( SELECT "auth"."uid"() AS "uid"))
      AND ("user_roles"."role" = 'super_admin'::"text")))));

DROP POLICY IF EXISTS "admins can delete season_podium" ON "public"."season_podium";
CREATE POLICY "super_admins can delete season_podium" ON "public"."season_podium"
  FOR DELETE TO "authenticated"
  USING ((EXISTS ( SELECT 1 FROM "public"."user_roles"
    WHERE (("user_roles"."user_id" = ( SELECT "auth"."uid"() AS "uid"))
      AND ("user_roles"."role" = 'super_admin'::"text")))));

DROP POLICY IF EXISTS "admins can delete sheet_configs" ON "public"."sheet_configs";
CREATE POLICY "super_admins can delete sheet_configs" ON "public"."sheet_configs"
  FOR DELETE TO "authenticated"
  USING ((EXISTS ( SELECT 1 FROM "public"."user_roles"
    WHERE (("user_roles"."user_id" = ( SELECT "auth"."uid"() AS "uid"))
      AND ("user_roles"."role" = 'super_admin'::"text")))));

DROP POLICY IF EXISTS "Allow admin delete from public-assets" ON "storage"."objects";
CREATE POLICY "Allow super_admin delete from public-assets" ON "storage"."objects"
  FOR DELETE TO "authenticated"
  USING (((bucket_id = 'public-assets'::text) AND (EXISTS ( SELECT 1
    FROM "public"."user_roles"
    WHERE (("user_roles"."user_id" = "auth"."uid"())
      AND ("user_roles"."role" = 'super_admin'::text))))));
