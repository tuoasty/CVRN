CREATE INDEX "pickem_pick_events_created_idx" ON "public"."pickem_pick_events" ("created_at" DESC, "id" DESC);

CREATE OR REPLACE FUNCTION "public"."pickem_activity"(
    "p_season_id" uuid,
    "p_source" text,
    "p_before_at" timestamptz,
    "p_before_source" text,
    "p_before_id" bigint,
    "p_limit" integer
)
RETURNS TABLE (
    "source" text,
    "id" bigint,
    "created_at" timestamptz,
    "action" text,
    "action_outcome" text,
    "actor_name" text,
    "target" jsonb,
    "event_kind" "public"."pickem_pick_event_kind",
    "match_id" uuid,
    "market_kind" "public"."pickem_market_kind",
    "roblox_user_id" text,
    "outcome_key" text,
    "previous_outcome_key" text,
    "stake" integer,
    "previous_stake" integer,
    "charged" integer,
    "payout" integer
)
LANGUAGE sql
STABLE
SECURITY INVOKER
SET "search_path" = ''
AS $$
    SELECT * FROM (
        (
            SELECT
                'admin'::text AS "src", a."id" AS "row_id", a."created_at" AS "at", a."action" AS "act", a."outcome" AS "act_outcome",
                COALESCE(a."display_name", a."username") AS "actor", a."target" AS "tgt",
                NULL::"public"."pickem_pick_event_kind" AS "ev_kind", NULL::uuid AS "mt_id", NULL::"public"."pickem_market_kind" AS "mk_kind",
                NULL::text AS "rb_id", NULL::text AS "oc_key", NULL::text AS "prev_key",
                NULL::integer AS "stk", NULL::integer AS "prev_stk", NULL::integer AS "chg", NULL::integer AS "pay"
            FROM "public"."audit_log" a
            WHERE "p_source" IN ('all', 'admin')
                AND a."kind" = 'action'
                AND a."action" IN ('publishPickemMatches', 'settlePickemMatches', 'refundPickemMarkets', 'updatePickemSettings')
                AND (a."action" = 'updatePickemSettings' OR a."target"->>'seasonId' = "p_season_id"::text)
                AND ("p_before_at" IS NULL OR (a."created_at", 'admin'::text, a."id") < ("p_before_at", "p_before_source", "p_before_id"))
            ORDER BY a."created_at" DESC, a."id" DESC
            LIMIT "p_limit"
        )
        UNION ALL
        (
            SELECT
                'game'::text, e."id", e."created_at", NULL::text, NULL::text, NULL::text, NULL::jsonb,
                e."kind", m."match_id", m."kind",
                e."roblox_user_id", e."outcome_key", e."previous_outcome_key", e."stake", e."previous_stake", e."charged", e."payout"
            FROM "public"."pickem_pick_events" e
            JOIN "public"."pickem_markets" m ON m."id" = e."market_id"
            JOIN "public"."matches" mt ON mt."id" = m."match_id"
            WHERE "p_source" IN ('all', 'game')
                AND mt."season_id" = "p_season_id"
                AND ("p_before_at" IS NULL OR (e."created_at", 'game'::text, e."id") < ("p_before_at", "p_before_source", "p_before_id"))
            ORDER BY e."created_at" DESC, e."id" DESC
            LIMIT "p_limit"
        )
    ) feed
    ORDER BY 3 DESC, 1 DESC, 2 DESC
    LIMIT "p_limit";
$$;

REVOKE EXECUTE ON FUNCTION "public"."pickem_activity"(uuid, text, timestamptz, text, bigint, integer) FROM "public", "anon";
GRANT EXECUTE ON FUNCTION "public"."pickem_activity"(uuid, text, timestamptz, text, bigint, integer) TO "authenticated";
