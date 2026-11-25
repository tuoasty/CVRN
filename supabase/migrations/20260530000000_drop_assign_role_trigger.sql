
DROP TRIGGER IF EXISTS "on_auth_user_created" ON "auth"."users";
DROP FUNCTION IF EXISTS "public"."assign_role_from_invite"();

DROP FUNCTION IF EXISTS "public"."add_to_pending_users"();
