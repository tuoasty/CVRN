CREATE OR REPLACE FUNCTION "public"."team_strength_ratings"(
    "p_season_number" integer DEFAULT NULL
)
RETURNS TABLE (
    "season_id" uuid,
    "team_id" uuid,
    "sets" integer,
    "rating" numeric,
    "spread" numeric
)
LANGUAGE "plpgsql" STABLE
AS $$
#variable_conflict use_column
DECLARE
    g_season uuid[];
    g_team uuid[];
    g_opp uuid[];
    g_sets integer[];
    g_margin double precision[];
    v_season uuid[];
    v_team uuid[];
    v_sets integer[];
    v_mov double precision[];
    v_rating double precision[];
    v_next double precision[];
    v_delta double precision;
    v_iter integer := 0;
BEGIN
    WITH set_margins AS (
        SELECT m.season_id, m.home_team_id AS team_id, m.away_team_id AS opp_id,
               (ms.home_score - ms.away_score)::double precision AS margin
        FROM "public"."matches" m
        JOIN "public"."seasons" s ON s.id = m.season_id
        JOIN "public"."match_sets" ms ON ms.match_id = m.id
        WHERE m.status = 'completed'
          AND NOT COALESCE(m.is_forfeit, false)
          AND m.home_team_id IS NOT NULL AND m.away_team_id IS NOT NULL
          AND ms.home_score IS NOT NULL AND ms.away_score IS NOT NULL
          AND (p_season_number IS NULL OR s.season_number = p_season_number)
        UNION ALL
        SELECT m.season_id, m.away_team_id, m.home_team_id,
               (ms.away_score - ms.home_score)::double precision
        FROM "public"."matches" m
        JOIN "public"."seasons" s ON s.id = m.season_id
        JOIN "public"."match_sets" ms ON ms.match_id = m.id
        WHERE m.status = 'completed'
          AND NOT COALESCE(m.is_forfeit, false)
          AND m.home_team_id IS NOT NULL AND m.away_team_id IS NOT NULL
          AND ms.home_score IS NOT NULL AND ms.away_score IS NOT NULL
          AND (p_season_number IS NULL OR s.season_number = p_season_number)
    ),
    pairs AS (
        SELECT sm.season_id, sm.team_id, sm.opp_id, count(*)::int AS sets, SUM(sm.margin) AS margin
        FROM set_margins sm
        GROUP BY sm.season_id, sm.team_id, sm.opp_id
    )
    SELECT
        array_agg(p.season_id ORDER BY p.season_id, p.team_id, p.opp_id),
        array_agg(p.team_id ORDER BY p.season_id, p.team_id, p.opp_id),
        array_agg(p.opp_id ORDER BY p.season_id, p.team_id, p.opp_id),
        array_agg(p.sets ORDER BY p.season_id, p.team_id, p.opp_id),
        array_agg(p.margin ORDER BY p.season_id, p.team_id, p.opp_id)
    INTO g_season, g_team, g_opp, g_sets, g_margin
    FROM pairs p;

    IF g_team IS NULL THEN
        RETURN;
    END IF;

    SELECT
        array_agg(t.season_id ORDER BY t.season_id, t.team_id),
        array_agg(t.team_id ORDER BY t.season_id, t.team_id),
        array_agg(t.sets ORDER BY t.season_id, t.team_id),
        array_agg(t.mov ORDER BY t.season_id, t.team_id)
    INTO v_season, v_team, v_sets, v_mov
    FROM (
        SELECT g.season_id, g.team_id, SUM(g.sets)::int AS sets, SUM(g.margin) / SUM(g.sets) AS mov
        FROM unnest(g_season, g_team, g_sets, g_margin) AS g(season_id, team_id, sets, margin)
        GROUP BY g.season_id, g.team_id
    ) t;

    v_rating := v_mov;

    LOOP
        v_iter := v_iter + 1;

        WITH cur AS (
            SELECT * FROM unnest(v_season, v_team, v_sets, v_mov, v_rating) AS c(season_id, team_id, sets, mov, rating)
        ),
        step AS (
            SELECT c.season_id, c.team_id, c.sets, c.rating AS prev,
                   0.25 * c.rating + 0.75 * (c.mov + SUM(g.sets * o.rating) / c.sets) AS rating
            FROM cur c
            JOIN unnest(g_season, g_team, g_opp, g_sets) AS g(season_id, team_id, opp_id, sets)
              ON g.season_id = c.season_id AND g.team_id = c.team_id
            JOIN cur o ON o.season_id = g.season_id AND o.team_id = g.opp_id
            GROUP BY c.season_id, c.team_id, c.sets, c.mov, c.rating
        )
        SELECT array_agg(z.rating ORDER BY z.season_id, z.team_id), max(abs(z.rating - z.prev))
        INTO v_next, v_delta
        FROM (
            SELECT s.season_id, s.team_id, s.prev,
                   s.rating - SUM(s.rating * s.sets) OVER (PARTITION BY s.season_id)
                            / SUM(s.sets) OVER (PARTITION BY s.season_id) AS rating
            FROM step s
        ) z;

        v_rating := v_next;

        EXIT WHEN v_delta < 1e-3 OR v_iter >= 1000;
    END LOOP;

    RETURN QUERY
    SELECT c.season_id, c.team_id, c.sets, c.rating::numeric,
           sqrt(
               SUM(c.sets * c.rating ^ 2) OVER (PARTITION BY c.season_id)
               / SUM(c.sets) OVER (PARTITION BY c.season_id)
           )::numeric
    FROM unnest(v_season, v_team, v_sets, v_rating) AS c(season_id, team_id, sets, rating);
END;
$$;

ALTER FUNCTION "public"."team_strength_ratings"(integer) OWNER TO "postgres";

GRANT EXECUTE ON FUNCTION "public"."team_strength_ratings"(integer) TO "anon";
GRANT EXECUTE ON FUNCTION "public"."team_strength_ratings"(integer) TO "authenticated";
GRANT EXECUTE ON FUNCTION "public"."team_strength_ratings"(integer) TO "service_role";
