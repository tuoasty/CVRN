CREATE TYPE "public"."pickem_market_kind" AS ENUM ('winner', 'match_length');
CREATE TYPE "public"."pickem_market_status" AS ENUM ('open', 'settled', 'refunded');

CREATE TABLE "public"."pickem_settings" (
    "id"          boolean       PRIMARY KEY DEFAULT true CHECK ("id"),
    "seed"        integer       NOT NULL DEFAULT 2000 CHECK ("seed" > 0),
    "rake"        numeric(4,3)  NOT NULL DEFAULT 0.05 CHECK ("rake" >= 0 AND "rake" < 1),
    "odds_floor"  numeric(4,2)  NOT NULL DEFAULT 1.00 CHECK ("odds_floor" >= 1),
    "sigma"       numeric(5,2)  NOT NULL DEFAULT 5.5 CHECK ("sigma" > 0),
    "shrink_sets" numeric(5,2)  NOT NULL DEFAULT 6 CHECK ("shrink_sets" >= 0),
    "prob_clamp"  numeric(4,3)  NOT NULL DEFAULT 0.03 CHECK ("prob_clamp" > 0 AND "prob_clamp" < 0.5),
    "updated_at"  timestamptz   NOT NULL DEFAULT now(),
    "updated_by"  uuid          REFERENCES "auth"."users"("id") ON DELETE SET NULL
);

INSERT INTO "public"."pickem_settings" DEFAULT VALUES;

CREATE TABLE "public"."pickem_markets" (
    "id"             uuid                            PRIMARY KEY DEFAULT gen_random_uuid(),
    "match_id"       uuid                            NOT NULL REFERENCES "public"."matches"("id") ON DELETE CASCADE,
    "kind"           "public"."pickem_market_kind"   NOT NULL,
    "seed"           integer                         NOT NULL CHECK ("seed" > 0),
    "rake"           numeric(4,3)                    NOT NULL CHECK ("rake" >= 0 AND "rake" < 1),
    "odds_floor"     numeric(4,2)                    NOT NULL CHECK ("odds_floor" >= 1),
    "status"         "public"."pickem_market_status" NOT NULL DEFAULT 'open',
    "result_outcome" text,
    "settled_at"     timestamptz,
    "settled_by"     uuid                            REFERENCES "auth"."users"("id") ON DELETE SET NULL,
    "created_at"     timestamptz                     NOT NULL DEFAULT now(),
    "created_by"     uuid                            REFERENCES "auth"."users"("id") ON DELETE SET NULL,
    UNIQUE ("match_id", "kind")
);

CREATE TABLE "public"."pickem_outcomes" (
    "market_id"  uuid          NOT NULL REFERENCES "public"."pickem_markets"("id") ON DELETE CASCADE,
    "key"        text          NOT NULL,
    "label"      text          NOT NULL,
    "sort_order" smallint      NOT NULL,
    "start_prob" numeric(6,5)  NOT NULL CHECK ("start_prob" > 0 AND "start_prob" < 1),
    "final_odds" numeric(8,2)  CHECK ("final_odds" >= 1),
    PRIMARY KEY ("market_id", "key")
);

CREATE TABLE "public"."pickem_picks" (
    "id"              uuid         PRIMARY KEY DEFAULT gen_random_uuid(),
    "market_id"       uuid         NOT NULL REFERENCES "public"."pickem_markets"("id") ON DELETE RESTRICT,
    "outcome_key"     text         NOT NULL,
    "roblox_user_id"  text         NOT NULL CHECK ("roblox_user_id" ~ '^[0-9]+$'),
    "stake"           integer      NOT NULL CHECK ("stake" > 0),
    "last_request_id" text,
    "last_charged"    integer,
    "payout"          integer      CHECK ("payout" >= 0),
    "claimed_at"      timestamptz,
    "created_at"      timestamptz  NOT NULL DEFAULT now(),
    "updated_at"      timestamptz  NOT NULL DEFAULT now(),
    FOREIGN KEY ("market_id", "outcome_key") REFERENCES "public"."pickem_outcomes"("market_id", "key") ON DELETE RESTRICT,
    UNIQUE ("market_id", "roblox_user_id")
);

CREATE INDEX "pickem_picks_unclaimed_idx" ON "public"."pickem_picks" ("roblox_user_id")
    WHERE "payout" IS NOT NULL AND "claimed_at" IS NULL;

ALTER TABLE "public"."pickem_settings" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."pickem_markets" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."pickem_outcomes" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."pickem_picks" ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON TABLE "public"."pickem_settings", "public"."pickem_markets", "public"."pickem_outcomes", "public"."pickem_picks" FROM "anon";

CREATE POLICY "admin select pickem_settings" ON "public"."pickem_settings"
    FOR SELECT TO "authenticated" USING ((SELECT "public"."has_group"('admin')));
CREATE POLICY "admin update pickem_settings" ON "public"."pickem_settings"
    FOR UPDATE TO "authenticated"
    USING ((SELECT "public"."has_group"('admin')))
    WITH CHECK ((SELECT "public"."has_group"('admin')));

CREATE POLICY "admin select pickem_markets" ON "public"."pickem_markets"
    FOR SELECT TO "authenticated" USING ((SELECT "public"."has_group"('admin')));
CREATE POLICY "admin insert pickem_markets" ON "public"."pickem_markets"
    FOR INSERT TO "authenticated" WITH CHECK ((SELECT "public"."has_group"('admin')));

CREATE POLICY "admin select pickem_outcomes" ON "public"."pickem_outcomes"
    FOR SELECT TO "authenticated" USING ((SELECT "public"."has_group"('admin')));
CREATE POLICY "admin insert pickem_outcomes" ON "public"."pickem_outcomes"
    FOR INSERT TO "authenticated" WITH CHECK ((SELECT "public"."has_group"('admin')));

CREATE POLICY "admin select pickem_picks" ON "public"."pickem_picks"
    FOR SELECT TO "authenticated" USING ((SELECT "public"."has_group"('admin')));

REVOKE INSERT, UPDATE, DELETE ON "public"."pickem_picks" FROM "authenticated";
REVOKE DELETE ON "public"."pickem_settings", "public"."pickem_markets", "public"."pickem_outcomes" FROM "authenticated";

CREATE OR REPLACE FUNCTION "public"."pickem_market_odds"("p_market_ids" uuid[])
RETURNS TABLE (
    "market_id" uuid,
    "outcome_key" text,
    "staked" bigint,
    "pool" bigint,
    "odds" numeric
)
LANGUAGE sql STABLE
SECURITY INVOKER
SET "search_path" = ''
AS $$
    WITH "stakes" AS (
        SELECT p."market_id", p."outcome_key", SUM(p."stake")::bigint AS "staked"
        FROM "public"."pickem_picks" p
        WHERE p."market_id" = ANY("p_market_ids")
        GROUP BY p."market_id", p."outcome_key"
    ),
    "totals" AS (
        SELECT s."market_id", SUM(s."staked")::bigint AS "total"
        FROM "stakes" s
        GROUP BY s."market_id"
    )
    SELECT
        o."market_id",
        o."key",
        COALESCE(s."staked", 0)::bigint,
        COALESCE(t."total", 0)::bigint,
        COALESCE(
            o."final_odds",
            GREATEST(
                m."odds_floor",
                FLOOR(
                    (1 - m."rake") * (m."seed" + COALESCE(t."total", 0))
                    / (m."seed" * o."start_prob" + COALESCE(s."staked", 0))
                    * 100
                ) / 100
            )
        )
    FROM "public"."pickem_outcomes" o
    JOIN "public"."pickem_markets" m ON m."id" = o."market_id"
    LEFT JOIN "stakes" s ON s."market_id" = o."market_id" AND s."outcome_key" = o."key"
    LEFT JOIN "totals" t ON t."market_id" = o."market_id"
    WHERE o."market_id" = ANY("p_market_ids")
    ORDER BY o."market_id", o."sort_order";
$$;

CREATE OR REPLACE FUNCTION "public"."publish_pickem_markets"("p_markets" jsonb)
RETURNS SETOF uuid
LANGUAGE plpgsql
SECURITY INVOKER
SET "search_path" = ''
AS $$
DECLARE
    v_settings "public"."pickem_settings"%ROWTYPE;
    v_market jsonb;
    v_outcome jsonb;
    v_match "public"."matches"%ROWTYPE;
    v_kind "public"."pickem_market_kind";
    v_expected text[];
    v_keys text[];
    v_prob_sum numeric;
    v_market_id uuid;
    v_order smallint;
BEGIN
    IF jsonb_typeof("p_markets") <> 'array' OR jsonb_array_length("p_markets") = 0 THEN
        RAISE EXCEPTION 'No markets to publish';
    END IF;

    SELECT * INTO v_settings FROM "public"."pickem_settings" WHERE "id";
    IF NOT FOUND THEN
        RAISE EXCEPTION 'Pickem settings are missing';
    END IF;

    FOR v_market IN SELECT * FROM jsonb_array_elements("p_markets") LOOP
        SELECT * INTO v_match FROM "public"."matches" WHERE "id" = (v_market->>'match_id')::uuid;
        IF NOT FOUND THEN
            RAISE EXCEPTION 'Match % not found', v_market->>'match_id';
        END IF;
        IF v_match."status" = 'completed' THEN
            RAISE EXCEPTION 'Match % is already completed', COALESCE(v_match."match_code", v_match."id"::text);
        END IF;
        IF v_match."home_team_id" IS NULL OR v_match."away_team_id" IS NULL THEN
            RAISE EXCEPTION 'Match % has no teams yet', COALESCE(v_match."match_code", v_match."id"::text);
        END IF;
        IF v_match."scheduled_at" IS NULL OR v_match."scheduled_at" <= now() THEN
            RAISE EXCEPTION 'Match % has no upcoming scheduled time', COALESCE(v_match."match_code", v_match."id"::text);
        END IF;

        v_kind := (v_market->>'kind')::"public"."pickem_market_kind";
        v_expected := CASE
            WHEN v_kind = 'winner' THEN ARRAY['home', 'away']
            WHEN v_match."best_of" = 5 THEN ARRAY['3-0', '3-1', '3-2']
            ELSE ARRAY['2-0', '2-1']
        END;

        SELECT array_agg(o->>'key' ORDER BY o->>'key'), SUM((o->>'start_prob')::numeric)
        INTO v_keys, v_prob_sum
        FROM jsonb_array_elements(v_market->'outcomes') o;

        IF v_keys IS DISTINCT FROM (SELECT array_agg(k ORDER BY k) FROM unnest(v_expected) k) THEN
            RAISE EXCEPTION 'Market % for match % has the wrong outcomes', v_kind, COALESCE(v_match."match_code", v_match."id"::text);
        END IF;
        IF abs(v_prob_sum - 1) > 0.001 THEN
            RAISE EXCEPTION 'Starting chances for market % of match % do not add up to 1', v_kind, COALESCE(v_match."match_code", v_match."id"::text);
        END IF;

        INSERT INTO "public"."pickem_markets" ("match_id", "kind", "seed", "rake", "odds_floor", "created_by")
        VALUES (v_match."id", v_kind, v_settings."seed", v_settings."rake", v_settings."odds_floor", auth.uid())
        RETURNING "id" INTO v_market_id;

        FOR v_outcome IN SELECT * FROM jsonb_array_elements(v_market->'outcomes') LOOP
            v_order := array_position(v_expected, v_outcome->>'key') - 1;
            INSERT INTO "public"."pickem_outcomes" ("market_id", "key", "label", "sort_order", "start_prob")
            VALUES (v_market_id, v_outcome->>'key', v_outcome->>'label', v_order, (v_outcome->>'start_prob')::numeric);
        END LOOP;

        RETURN NEXT v_market_id;
    END LOOP;
END;
$$;

REVOKE EXECUTE ON FUNCTION "public"."pickem_market_odds"(uuid[]) FROM "anon", "public";
REVOKE EXECUTE ON FUNCTION "public"."publish_pickem_markets"(jsonb) FROM "anon", "public";
GRANT EXECUTE ON FUNCTION "public"."pickem_market_odds"(uuid[]) TO "authenticated", "service_role";
GRANT EXECUTE ON FUNCTION "public"."publish_pickem_markets"(jsonb) TO "authenticated";
