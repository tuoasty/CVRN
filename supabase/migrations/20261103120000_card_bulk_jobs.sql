CREATE TABLE "public"."card_bulk_jobs" (
    "id"               uuid        NOT NULL DEFAULT gen_random_uuid(),
    "season_number"    integer     NOT NULL,
    "region_code"      text        NOT NULL,
    "group_id"         uuid        NOT NULL,
    "mode"             text        NOT NULL,
    "status"           text        NOT NULL DEFAULT 'running',
    "stop_requested"   boolean     NOT NULL DEFAULT false,
    "stop_reason"      text,
    "total"            integer     NOT NULL,
    "done"             integer     NOT NULL DEFAULT 0,
    "failed"           integer     NOT NULL DEFAULT 0,
    "failures"         jsonb       NOT NULL DEFAULT '[]'::jsonb,
    "current_username" text,
    "started_by"       uuid,
    "started_at"       timestamptz NOT NULL DEFAULT now(),
    "heartbeat_at"     timestamptz NOT NULL DEFAULT now(),
    "finished_at"      timestamptz,
    CONSTRAINT "card_bulk_jobs_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "card_bulk_jobs_group_id_fkey" FOREIGN KEY ("group_id") REFERENCES "public"."card_groups"("id") ON DELETE CASCADE,
    CONSTRAINT "card_bulk_jobs_started_by_fkey" FOREIGN KEY ("started_by") REFERENCES "auth"."users"("id") ON DELETE SET NULL,
    CONSTRAINT "card_bulk_jobs_mode_check" CHECK ("mode" = ANY (ARRAY['missing'::text, 'all'::text])),
    CONSTRAINT "card_bulk_jobs_status_check" CHECK ("status" = ANY (ARRAY['running'::text, 'completed'::text, 'stopped'::text, 'interrupted'::text]))
);

CREATE UNIQUE INDEX "card_bulk_jobs_one_running" ON "public"."card_bulk_jobs" ((1)) WHERE "status" = 'running';
CREATE INDEX "card_bulk_jobs_started_at_idx" ON "public"."card_bulk_jobs" ("started_at" DESC);

ALTER TABLE "public"."card_bulk_jobs" ENABLE ROW LEVEL SECURITY;

CREATE POLICY "admins can read card_bulk_jobs" ON "public"."card_bulk_jobs"
    FOR SELECT TO "authenticated"
    USING ((EXISTS (SELECT 1 FROM "public"."user_roles"
        WHERE (("user_roles"."user_id" = (SELECT "auth"."uid"() AS "uid"))
            AND ("user_roles"."role" = ANY (ARRAY['admin'::"text", 'super_admin'::"text"]))))));
