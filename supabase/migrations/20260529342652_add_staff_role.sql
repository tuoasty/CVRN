
ALTER TABLE "public"."pending_users"
  DROP CONSTRAINT IF EXISTS "pending_users_role_check";

ALTER TABLE "public"."pending_users"
  ADD CONSTRAINT "pending_users_role_check"
  CHECK (("role" = ANY (ARRAY[
    'user'::"text",
    'admin'::"text",
    'super_admin'::"text",
    'stat_tracker'::"text",
    'staff'::"text"
  ])));

ALTER TABLE "public"."user_roles"
  DROP CONSTRAINT IF EXISTS "user_roles_role_check";

ALTER TABLE "public"."user_roles"
  ADD CONSTRAINT "user_roles_role_check"
  CHECK (("role" = ANY (ARRAY[
    'super_admin'::"text",
    'admin'::"text",
    'stat_tracker'::"text",
    'staff'::"text"
  ])));
