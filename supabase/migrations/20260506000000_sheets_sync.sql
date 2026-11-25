
CREATE TABLE sheet_configs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  season_id uuid NOT NULL REFERENCES seasons(id),
  sheet_id text NOT NULL,
  tab_name text NOT NULL,
  sheet_type text NOT NULL CHECK (sheet_type IN ('qualifier', 'playoff', 'teams')),
  header_row int NOT NULL DEFAULT 9,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE TABLE sheet_sync_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  sheet_config_id uuid NOT NULL REFERENCES sheet_configs(id),
  synced_at timestamptz NOT NULL DEFAULT now(),
  triggered_by text NOT NULL CHECK (triggered_by IN ('cron', 'manual')),
  status text NOT NULL CHECK (status IN ('success', 'partial', 'failed')),
  rows_processed int NOT NULL DEFAULT 0,
  rows_errored int NOT NULL DEFAULT 0,
  errors jsonb NOT NULL DEFAULT '[]'
);

ALTER TABLE matches ADD COLUMN match_code text UNIQUE;

ALTER TABLE teams ADD COLUMN team_number int;
ALTER TABLE teams ADD CONSTRAINT teams_season_number_unique UNIQUE (season_id, team_number);

ALTER TABLE "public"."sheet_configs" ENABLE ROW LEVEL SECURITY;

CREATE POLICY "anyone can read sheet_configs" ON "public"."sheet_configs"
  FOR SELECT TO "authenticated", "anon" USING (true);

CREATE POLICY "admins can insert sheet_configs" ON "public"."sheet_configs"
  FOR INSERT TO "authenticated"
  WITH CHECK ((EXISTS ( SELECT 1 FROM "public"."user_roles"
    WHERE (("user_roles"."user_id" = ( SELECT "auth"."uid"() AS "uid"))
      AND ("user_roles"."role" = ANY (ARRAY['admin'::"text", 'super_admin'::"text"]))))));

CREATE POLICY "admins can update sheet_configs" ON "public"."sheet_configs"
  FOR UPDATE TO "authenticated"
  USING ((EXISTS ( SELECT 1 FROM "public"."user_roles"
    WHERE (("user_roles"."user_id" = ( SELECT "auth"."uid"() AS "uid"))
      AND ("user_roles"."role" = ANY (ARRAY['admin'::"text", 'super_admin'::"text"]))))));

CREATE POLICY "admins can delete sheet_configs" ON "public"."sheet_configs"
  FOR DELETE TO "authenticated"
  USING ((EXISTS ( SELECT 1 FROM "public"."user_roles"
    WHERE (("user_roles"."user_id" = ( SELECT "auth"."uid"() AS "uid"))
      AND ("user_roles"."role" = ANY (ARRAY['admin'::"text", 'super_admin'::"text"]))))));

ALTER TABLE "public"."sheet_sync_logs" ENABLE ROW LEVEL SECURITY;

CREATE POLICY "anyone can read sheet_sync_logs" ON "public"."sheet_sync_logs"
  FOR SELECT TO "authenticated", "anon" USING (true);

CREATE POLICY "admins can insert sheet_sync_logs" ON "public"."sheet_sync_logs"
  FOR INSERT TO "authenticated"
  WITH CHECK ((EXISTS ( SELECT 1 FROM "public"."user_roles"
    WHERE (("user_roles"."user_id" = ( SELECT "auth"."uid"() AS "uid"))
      AND ("user_roles"."role" = ANY (ARRAY['admin'::"text", 'super_admin'::"text"]))))));
