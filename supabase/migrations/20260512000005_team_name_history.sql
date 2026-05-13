CREATE TABLE "public"."team_name_history" (
  "id"         uuid        NOT NULL DEFAULT gen_random_uuid(),
  "team_id"    uuid        NOT NULL,
  "old_name"   text        NOT NULL,
  "new_name"   text        NOT NULL,
  "changed_at" timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT "team_name_history_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "team_name_history_team_id_fkey" FOREIGN KEY ("team_id") REFERENCES "public"."teams"("id")
);

CREATE INDEX "team_name_history_team_id_changed_at_idx"
  ON "public"."team_name_history" ("team_id", "changed_at" DESC);

ALTER TABLE "public"."team_name_history" ENABLE ROW LEVEL SECURITY;

CREATE POLICY "anyone can read team_name_history"
  ON "public"."team_name_history"
  FOR SELECT TO "authenticated", "anon"
  USING (true);

CREATE POLICY "admins can insert team_name_history"
  ON "public"."team_name_history"
  FOR INSERT TO "authenticated"
  WITH CHECK ((EXISTS (
    SELECT 1 FROM "public"."user_roles"
    WHERE (("user_roles"."user_id" = (SELECT "auth"."uid"() AS "uid"))
      AND ("user_roles"."role" = ANY (ARRAY['admin'::"text", 'super_admin'::"text"])))
  )));
