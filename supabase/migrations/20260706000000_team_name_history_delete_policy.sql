
CREATE POLICY "super_admins can delete team_name_history"
  ON "public"."team_name_history"
  FOR DELETE TO "authenticated"
  USING ((EXISTS ( SELECT 1 FROM "public"."user_roles"
    WHERE (("user_roles"."user_id" = ( SELECT "auth"."uid"() AS "uid"))
      AND ("user_roles"."role" = 'super_admin'::"text")))));
