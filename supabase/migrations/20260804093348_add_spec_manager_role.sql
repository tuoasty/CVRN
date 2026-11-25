
ALTER TABLE "public"."pending_users"
  DROP CONSTRAINT IF EXISTS "pending_users_role_check";

ALTER TABLE "public"."pending_users"
  ADD CONSTRAINT "pending_users_role_check"
  CHECK (("role" = ANY (ARRAY[
    'user'::"text",
    'admin'::"text",
    'super_admin'::"text",
    'stat_tracker'::"text",
    'staff'::"text",
    'spec_manager'::"text"
  ])));

ALTER TABLE "public"."user_roles"
  DROP CONSTRAINT IF EXISTS "user_roles_role_check";

ALTER TABLE "public"."user_roles"
  ADD CONSTRAINT "user_roles_role_check"
  CHECK (("role" = ANY (ARRAY[
    'super_admin'::"text",
    'admin'::"text",
    'stat_tracker'::"text",
    'staff'::"text",
    'spec_manager'::"text"
  ])));

DROP POLICY IF EXISTS "admins can insert specs" ON "public"."specs";
CREATE POLICY "admins can insert specs" ON "public"."specs"
  FOR INSERT TO "authenticated"
  WITH CHECK ((EXISTS ( SELECT 1 FROM "public"."user_roles"
    WHERE (("user_roles"."user_id" = ( SELECT "auth"."uid"() AS "uid"))
      AND ("user_roles"."role" = ANY (ARRAY['admin'::"text", 'super_admin'::"text", 'spec_manager'::"text"]))))));

DROP POLICY IF EXISTS "admins can update specs" ON "public"."specs";
CREATE POLICY "admins can update specs" ON "public"."specs"
  FOR UPDATE TO "authenticated"
  USING ((EXISTS ( SELECT 1 FROM "public"."user_roles"
    WHERE (("user_roles"."user_id" = ( SELECT "auth"."uid"() AS "uid"))
      AND ("user_roles"."role" = ANY (ARRAY['admin'::"text", 'super_admin'::"text", 'spec_manager'::"text"]))))));

DROP POLICY IF EXISTS "admins can delete specs" ON "public"."specs";
CREATE POLICY "admins can delete specs" ON "public"."specs"
  FOR DELETE TO "authenticated"
  USING ((EXISTS ( SELECT 1 FROM "public"."user_roles"
    WHERE (("user_roles"."user_id" = ( SELECT "auth"."uid"() AS "uid"))
      AND ("user_roles"."role" = ANY (ARRAY['admin'::"text", 'super_admin'::"text", 'spec_manager'::"text"]))))));

DROP POLICY IF EXISTS "admins can read spec_requirements" ON "public"."spec_requirements";
CREATE POLICY "admins can read spec_requirements" ON "public"."spec_requirements"
  FOR SELECT TO "authenticated"
  USING ((EXISTS ( SELECT 1 FROM "public"."user_roles"
    WHERE (("user_roles"."user_id" = ( SELECT "auth"."uid"() AS "uid"))
      AND ("user_roles"."role" = ANY (ARRAY['admin'::"text", 'super_admin'::"text", 'spec_manager'::"text"]))))));

DROP POLICY IF EXISTS "admins can insert spec_requirements" ON "public"."spec_requirements";
CREATE POLICY "admins can insert spec_requirements" ON "public"."spec_requirements"
  FOR INSERT TO "authenticated"
  WITH CHECK ((EXISTS ( SELECT 1 FROM "public"."user_roles"
    WHERE (("user_roles"."user_id" = ( SELECT "auth"."uid"() AS "uid"))
      AND ("user_roles"."role" = ANY (ARRAY['admin'::"text", 'super_admin'::"text", 'spec_manager'::"text"]))))));

DROP POLICY IF EXISTS "admins can update spec_requirements" ON "public"."spec_requirements";
CREATE POLICY "admins can update spec_requirements" ON "public"."spec_requirements"
  FOR UPDATE TO "authenticated"
  USING ((EXISTS ( SELECT 1 FROM "public"."user_roles"
    WHERE (("user_roles"."user_id" = ( SELECT "auth"."uid"() AS "uid"))
      AND ("user_roles"."role" = ANY (ARRAY['admin'::"text", 'super_admin'::"text", 'spec_manager'::"text"]))))));

DROP POLICY IF EXISTS "admins can delete spec_requirements" ON "public"."spec_requirements";
CREATE POLICY "admins can delete spec_requirements" ON "public"."spec_requirements"
  FOR DELETE TO "authenticated"
  USING ((EXISTS ( SELECT 1 FROM "public"."user_roles"
    WHERE (("user_roles"."user_id" = ( SELECT "auth"."uid"() AS "uid"))
      AND ("user_roles"."role" = ANY (ARRAY['admin'::"text", 'super_admin'::"text", 'spec_manager'::"text"]))))));
