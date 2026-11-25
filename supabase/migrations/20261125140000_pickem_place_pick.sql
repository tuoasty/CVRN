CREATE OR REPLACE FUNCTION "public"."place_pickem_pick"(
    "p_request_id" text,
    "p_roblox_user_id" text,
    "p_market_id" uuid,
    "p_outcome_key" text,
    "p_stake" integer
)
RETURNS TABLE (
    "pick_id" uuid,
    "outcome_key" text,
    "stake" integer,
    "charged" integer,
    "replayed" boolean
)
LANGUAGE plpgsql
SECURITY INVOKER
SET "search_path" = ''
AS $$
#variable_conflict use_column
DECLARE
    v_market "public"."pickem_markets"%ROWTYPE;
    v_match "public"."matches"%ROWTYPE;
    v_settings "public"."pickem_settings"%ROWTYPE;
    v_pick "public"."pickem_picks"%ROWTYPE;
    v_charged integer;
BEGIN
    IF "p_request_id" IS NULL OR length("p_request_id") = 0 OR length("p_request_id") > 100 THEN
        RAISE EXCEPTION 'request_id must be 1 to 100 characters' USING HINT = 'INVALID_REQUEST';
    END IF;
    IF "p_roblox_user_id" IS NULL OR "p_roblox_user_id" !~ '^[0-9]{1,20}$' THEN
        RAISE EXCEPTION 'roblox_user_id must be digits' USING HINT = 'INVALID_REQUEST';
    END IF;

    SELECT * INTO v_market FROM "public"."pickem_markets" WHERE "id" = "p_market_id" FOR UPDATE;
    IF NOT FOUND THEN
        RAISE EXCEPTION 'Market not found' USING HINT = 'MARKET_NOT_FOUND';
    END IF;

    SELECT * INTO v_pick FROM "public"."pickem_picks"
    WHERE "market_id" = "p_market_id" AND "roblox_user_id" = "p_roblox_user_id";

    IF FOUND AND v_pick."last_request_id" = "p_request_id" THEN
        RETURN QUERY SELECT v_pick."id", v_pick."outcome_key", v_pick."stake", COALESCE(v_pick."last_charged", 0), true;
        RETURN;
    END IF;

    SELECT * INTO v_match FROM "public"."matches" WHERE "id" = v_market."match_id";
    IF v_market."status" <> 'open'
        OR v_match."status" = 'completed'
        OR v_match."home_team_id" IS NULL
        OR v_match."away_team_id" IS NULL
        OR v_match."scheduled_at" IS NULL
        OR v_match."scheduled_at" <= now() THEN
        RAISE EXCEPTION 'Market is locked' USING HINT = 'MARKET_LOCKED';
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM "public"."pickem_outcomes" o
        WHERE o."market_id" = "p_market_id" AND o."key" = "p_outcome_key"
    ) THEN
        RAISE EXCEPTION 'Outcome % is not part of this market', "p_outcome_key" USING HINT = 'OUTCOME_NOT_FOUND';
    END IF;

    SELECT * INTO v_settings FROM "public"."pickem_settings" WHERE "id";
    IF "p_stake" IS NULL OR "p_stake" < v_settings."stake_min" OR "p_stake" > v_settings."stake_max" THEN
        RAISE EXCEPTION 'Stake must be between % and %', v_settings."stake_min", v_settings."stake_max" USING HINT = 'STAKE_OUT_OF_RANGE';
    END IF;

    IF v_pick."id" IS NULL THEN
        INSERT INTO "public"."pickem_picks" ("market_id", "outcome_key", "roblox_user_id", "stake", "last_request_id", "last_charged")
        VALUES ("p_market_id", "p_outcome_key", "p_roblox_user_id", "p_stake", "p_request_id", "p_stake")
        RETURNING * INTO v_pick;
        v_charged := "p_stake";
    ELSE
        IF "p_stake" < v_pick."stake" THEN
            RAISE EXCEPTION 'Stake cannot go below the current %', v_pick."stake" USING HINT = 'STAKE_LOWERED';
        END IF;
        v_charged := "p_stake" - v_pick."stake";
        UPDATE "public"."pickem_picks"
        SET "outcome_key" = "p_outcome_key",
            "stake" = "p_stake",
            "last_request_id" = "p_request_id",
            "last_charged" = v_charged,
            "updated_at" = now()
        WHERE "id" = v_pick."id"
        RETURNING * INTO v_pick;
    END IF;

    RETURN QUERY SELECT v_pick."id", v_pick."outcome_key", v_pick."stake", v_charged, false;
END;
$$;

REVOKE EXECUTE ON FUNCTION "public"."place_pickem_pick"(text, text, uuid, text, integer) FROM "public", "anon", "authenticated";
GRANT EXECUTE ON FUNCTION "public"."place_pickem_pick"(text, text, uuid, text, integer) TO "service_role";
