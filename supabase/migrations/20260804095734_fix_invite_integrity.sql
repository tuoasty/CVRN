
DELETE FROM "public"."user_roles" a
USING "public"."user_roles" b
WHERE a."user_id" = b."user_id"
  AND (
    COALESCE(a."created_at", 'epoch'::timestamptz) > COALESCE(b."created_at", 'epoch'::timestamptz)
    OR (
      COALESCE(a."created_at", 'epoch'::timestamptz) = COALESCE(b."created_at", 'epoch'::timestamptz)
      AND a."id" > b."id"
    )
  );

ALTER TABLE "public"."user_roles"
  DROP CONSTRAINT IF EXISTS "user_roles_user_id_key";

ALTER TABLE "public"."user_roles"
  ADD CONSTRAINT "user_roles_user_id_key" UNIQUE ("user_id");

UPDATE "public"."pending_users"
SET "email" = lower(trim("email"))
WHERE "email" <> lower(trim("email"));

DELETE FROM "public"."pending_users" a
USING "public"."pending_users" b
WHERE a."email" = b."email"
  AND (
    COALESCE(a."expires_at", 'epoch'::timestamptz) < COALESCE(b."expires_at", 'epoch'::timestamptz)
    OR (
      COALESCE(a."expires_at", 'epoch'::timestamptz) = COALESCE(b."expires_at", 'epoch'::timestamptz)
      AND a."id" < b."id"
    )
  );

DROP INDEX IF EXISTS "public"."pending_users_email_lower_key";

CREATE UNIQUE INDEX "pending_users_email_lower_key"
  ON "public"."pending_users" (lower("email"));

UPDATE "public"."pending_users"
SET "expires_at" = now() + interval '7 days'
WHERE "accepted" = false
  AND ("expires_at" IS NULL OR "expires_at" <= now());
