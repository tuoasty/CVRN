CREATE OR REPLACE FUNCTION "public"."settle_pickem_matches"("p_match_ids" uuid[], "p_dry_run" boolean)
RETURNS TABLE (
    "match_id" uuid,
    "market_id" uuid,
    "kind" "public"."pickem_market_kind",
    "outcome_key" text,
    "result" text,
    "forfeit" boolean,
    "picks" integer,
    "staked" bigint,
    "final_odds" numeric,
    "payout" bigint
)
LANGUAGE plpgsql
SECURITY DEFINER
SET "search_path" = ''
AS $$
#variable_conflict use_column
DECLARE
    v_match_id uuid;
    v_match "public"."matches"%ROWTYPE;
    v_market "public"."pickem_markets"%ROWTYPE;
    v_name text;
    v_open integer;
    v_winner text;
    v_length text;
    v_key text;
BEGIN
    IF NOT "public"."has_group"('admin') THEN
        RAISE EXCEPTION 'Only admins can settle pickems' USING ERRCODE = '42501';
    END IF;
    IF "p_match_ids" IS NULL OR cardinality("p_match_ids") = 0 THEN
        RAISE EXCEPTION 'No matches to settle';
    END IF;

    FOREACH v_match_id IN ARRAY (SELECT array_agg(DISTINCT id ORDER BY id) FROM unnest("p_match_ids") id) LOOP
        SELECT * INTO v_match FROM "public"."matches" WHERE "id" = v_match_id FOR SHARE;
        IF NOT FOUND THEN
            RAISE EXCEPTION 'Match % not found', v_match_id;
        END IF;
        v_name := COALESCE(v_match."match_code", v_match."id"::text);

        IF v_match."status" <> 'completed' THEN
            RAISE EXCEPTION 'Match % has no result yet', v_name;
        END IF;

        SELECT count(*) INTO v_open FROM "public"."pickem_markets" m
        WHERE m."match_id" = v_match."id" AND m."status" = 'open';
        IF v_open = 0 THEN
            RAISE EXCEPTION 'Match % has no open markets to settle', v_name;
        END IF;

        v_winner := NULL;
        v_length := NULL;
        IF NOT v_match."is_forfeit" THEN
            IF v_match."home_sets_won" IS NULL OR v_match."away_sets_won" IS NULL OR v_match."home_sets_won" = v_match."away_sets_won" THEN
                RAISE EXCEPTION 'Match % has no clear winner', v_name;
            END IF;
            v_winner := CASE WHEN v_match."home_sets_won" > v_match."away_sets_won" THEN 'home' ELSE 'away' END;
            v_length := GREATEST(v_match."home_sets_won", v_match."away_sets_won") || '-' || LEAST(v_match."home_sets_won", v_match."away_sets_won");
        END IF;

        FOR v_market IN
            SELECT * FROM "public"."pickem_markets" m
            WHERE m."match_id" = v_match."id" AND m."status" = 'open'
            ORDER BY m."kind"
            FOR UPDATE
        LOOP
            v_key := CASE
                WHEN v_match."is_forfeit" THEN NULL
                WHEN v_market."kind" = 'winner' THEN v_winner
                ELSE v_length
            END;

            IF v_key IS NOT NULL AND NOT EXISTS (
                SELECT 1 FROM "public"."pickem_outcomes" o
                WHERE o."market_id" = v_market."id" AND o."key" = v_key
            ) THEN
                RAISE EXCEPTION 'Result % is not an outcome of the % market for match %. Refund it instead.', v_key, v_market."kind", v_name;
            END IF;

            RETURN QUERY
            WITH "odds" AS (
                SELECT * FROM "public"."pickem_market_odds"(ARRAY[v_market."id"])
            ),
            "per_pick" AS (
                SELECT
                    p."outcome_key",
                    CASE
                        WHEN v_key IS NULL THEN p."stake"
                        WHEN p."outcome_key" = v_key THEN FLOOR(p."stake" * od."odds")::integer
                        ELSE 0
                    END AS "paid"
                FROM "public"."pickem_picks" p
                JOIN "odds" od ON od."outcome_key" = p."outcome_key"
                WHERE p."market_id" = v_market."id"
            ),
            "agg" AS (
                SELECT pp."outcome_key", count(*)::integer AS "n", SUM(pp."paid")::bigint AS "paid"
                FROM "per_pick" pp
                GROUP BY pp."outcome_key"
            ),
            "ordered" AS (
                SELECT o."key", o."sort_order" FROM "public"."pickem_outcomes" o WHERE o."market_id" = v_market."id"
            )
            SELECT
                v_match."id",
                v_market."id",
                v_market."kind",
                od."outcome_key",
                CASE WHEN v_key IS NULL THEN 'refund' WHEN od."outcome_key" = v_key THEN 'win' ELSE 'loss' END,
                v_match."is_forfeit",
                COALESCE(a."n", 0),
                od."staked",
                CASE WHEN v_key IS NULL THEN NULL ELSE od."odds" END,
                COALESCE(a."paid", 0)::bigint
            FROM "odds" od
            JOIN "ordered" ord ON ord."key" = od."outcome_key"
            LEFT JOIN "agg" a ON a."outcome_key" = od."outcome_key"
            ORDER BY ord."sort_order";

            IF NOT "p_dry_run" THEN
                IF v_key IS NULL THEN
                    UPDATE "public"."pickem_picks" p
                    SET "payout" = p."stake", "updated_at" = now()
                    WHERE p."market_id" = v_market."id";

                    UPDATE "public"."pickem_markets" m
                    SET "status" = 'refunded', "settled_at" = now(), "settled_by" = auth.uid()
                    WHERE m."id" = v_market."id";
                ELSE
                    UPDATE "public"."pickem_outcomes" o
                    SET "final_odds" = od."odds"
                    FROM "public"."pickem_market_odds"(ARRAY[v_market."id"]) od
                    WHERE o."market_id" = v_market."id" AND o."key" = od."outcome_key";

                    UPDATE "public"."pickem_picks" p
                    SET "payout" = CASE WHEN p."outcome_key" = v_key THEN FLOOR(p."stake" * o."final_odds")::integer ELSE 0 END,
                        "updated_at" = now()
                    FROM "public"."pickem_outcomes" o
                    WHERE p."market_id" = v_market."id" AND o."market_id" = p."market_id" AND o."key" = p."outcome_key";

                    UPDATE "public"."pickem_markets" m
                    SET "status" = 'settled', "result_outcome" = v_key, "settled_at" = now(), "settled_by" = auth.uid()
                    WHERE m."id" = v_market."id";
                END IF;
            END IF;
        END LOOP;
    END LOOP;
END;
$$;

CREATE OR REPLACE FUNCTION "public"."refund_pickem_markets"("p_market_ids" uuid[])
RETURNS TABLE (
    "market_id" uuid,
    "picks" integer,
    "refunded" bigint
)
LANGUAGE plpgsql
SECURITY DEFINER
SET "search_path" = ''
AS $$
#variable_conflict use_column
DECLARE
    v_ids uuid[];
    v_found integer;
    v_closed integer;
BEGIN
    IF NOT "public"."has_group"('admin') THEN
        RAISE EXCEPTION 'Only admins can refund pickems' USING ERRCODE = '42501';
    END IF;
    IF "p_market_ids" IS NULL OR cardinality("p_market_ids") = 0 THEN
        RAISE EXCEPTION 'No markets to refund';
    END IF;

    SELECT array_agg(DISTINCT id ORDER BY id) INTO v_ids FROM unnest("p_market_ids") id;

    PERFORM 1 FROM "public"."pickem_markets" m WHERE m."id" = ANY(v_ids) ORDER BY m."id" FOR UPDATE;

    SELECT count(*), count(*) FILTER (WHERE m."status" <> 'open')
    INTO v_found, v_closed
    FROM "public"."pickem_markets" m
    WHERE m."id" = ANY(v_ids);

    IF v_found <> cardinality(v_ids) THEN
        RAISE EXCEPTION 'Some markets no longer exist';
    END IF;
    IF v_closed > 0 THEN
        RAISE EXCEPTION 'Some markets are already settled or refunded';
    END IF;

    UPDATE "public"."pickem_picks" p
    SET "payout" = p."stake", "updated_at" = now()
    WHERE p."market_id" = ANY(v_ids);

    UPDATE "public"."pickem_markets" m
    SET "status" = 'refunded', "settled_at" = now(), "settled_by" = auth.uid()
    WHERE m."id" = ANY(v_ids);

    RETURN QUERY
    SELECT m."id", count(p."id")::integer, COALESCE(SUM(p."stake"), 0)::bigint
    FROM "public"."pickem_markets" m
    LEFT JOIN "public"."pickem_picks" p ON p."market_id" = m."id"
    WHERE m."id" = ANY(v_ids)
    GROUP BY m."id";
END;
$$;

REVOKE EXECUTE ON FUNCTION "public"."settle_pickem_matches"(uuid[], boolean) FROM "public", "anon";
REVOKE EXECUTE ON FUNCTION "public"."refund_pickem_markets"(uuid[]) FROM "public", "anon";
GRANT EXECUTE ON FUNCTION "public"."settle_pickem_matches"(uuid[], boolean) TO "authenticated";
GRANT EXECUTE ON FUNCTION "public"."refund_pickem_markets"(uuid[]) TO "authenticated";
