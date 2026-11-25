CREATE TABLE "public"."audit_log" (
    "id"              bigint                  GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    "created_at"      timestamptz             NOT NULL DEFAULT now(),
    "kind"            text                    NOT NULL CHECK ("kind" IN ('action', 'auth')),
    "user_id"         uuid                    REFERENCES "auth"."users"("id") ON DELETE SET NULL,
    "discord_user_id" text,
    "display_name"    text,
    "username"        text,
    "avatar_url"      text,
    "groups"          "public"."access_group"[] NOT NULL DEFAULT '{}',
    "action"          text                    NOT NULL,
    "outcome"         text                    NOT NULL CHECK ("outcome" IN ('allowed', 'denied')),
    "target"          jsonb
);

CREATE INDEX "audit_log_user_id_id_idx" ON "public"."audit_log" ("user_id", "id" DESC);
CREATE INDEX "audit_log_action_id_idx" ON "public"."audit_log" ("action", "id" DESC);
CREATE INDEX "audit_log_kind_outcome_id_idx" ON "public"."audit_log" ("kind", "outcome", "id" DESC);

ALTER TABLE "public"."audit_log" ENABLE ROW LEVEL SECURITY;

CREATE POLICY "admin select audit_log" ON "public"."audit_log"
    FOR SELECT TO "authenticated" USING ((SELECT "public"."has_group"('admin')));

REVOKE INSERT, UPDATE, DELETE ON "public"."audit_log" FROM "anon", "authenticated";
