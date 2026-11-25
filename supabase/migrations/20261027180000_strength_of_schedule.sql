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
            SELECT c.season_id, c.team_id, c.sets,
                   0.5 * c.rating + 0.5 * (c.mov + SUM(g.sets * o.rating) / c.sets) AS rating
            FROM cur c
            JOIN unnest(g_season, g_team, g_opp, g_sets) AS g(season_id, team_id, opp_id, sets)
              ON g.season_id = c.season_id AND g.team_id = c.team_id
            JOIN cur o ON o.season_id = g.season_id AND o.team_id = g.opp_id
            GROUP BY c.season_id, c.team_id, c.sets, c.mov, c.rating
        )
        SELECT array_agg(z.rating ORDER BY z.season_id, z.team_id)
        INTO v_next
        FROM (
            SELECT s.season_id, s.team_id,
                   s.rating - SUM(s.rating * s.sets) OVER (PARTITION BY s.season_id)
                            / SUM(s.sets) OVER (PARTITION BY s.season_id) AS rating
            FROM step s
        ) z;

        SELECT max(abs(d.nxt - d.prev)) INTO v_delta
        FROM unnest(v_rating, v_next) AS d(prev, nxt);

        v_rating := v_next;

        EXIT WHEN v_delta < 1e-7 OR v_iter >= 1000;
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

CREATE OR REPLACE FUNCTION "public"."player_category_ranks"(
    "p_season_number" integer DEFAULT NULL
)
RETURNS TABLE (
    "player_id" uuid,
    "roblox_user_id" bigint,
    "sets_played" numeric,
    "points_per_set" numeric,
    "kills_per_set" numeric,
    "assists_per_set" numeric,
    "blocks_per_set" numeric,
    "receives_per_set" numeric,
    "digs_per_set" numeric,
    "aces_per_set" numeric,
    "net_serve_per_set" numeric,
    "scoring_rank" numeric,
    "spiking_rank" numeric,
    "setting_rank" numeric,
    "blocking_rank" numeric,
    "receiving_rank" numeric,
    "serving_rank" numeric
)
LANGUAGE "sql" STABLE
AS $$
    WITH played AS (
        SELECT
            pms.player_id,
            pms.set_number,
            m.season_id,
            CASE WHEN pms.team_id = m.home_team_id THEN m.away_team_id ELSE m.home_team_id END AS opp_id,
            pms.ape_kills, pms.delay_kills, pms.quick_kills, pms.wipes_tools,
            pms.kill_attempts, pms.spiking_errors,
            pms.assists, pms.setting_errors,
            pms.kill_blocks, pms.block_touches,
            pms.serve_receives, pms.digs, pms.block_follows, pms.dives,
            pms.jump_serve_aces, pms.aces, pms.float_aces, pms.service_errors
        FROM "public"."player_match_stats" pms
        JOIN "public"."matches" m ON m.id = pms.match_id
        JOIN "public"."seasons" s ON s.id = m.season_id
        WHERE m.status = 'completed'
          AND (p_season_number IS NULL OR s.season_number = p_season_number)
          AND (
            pms.ape_kills + pms.ape_attempts + pms.delay_kills + pms.quick_kills +
            pms.wipes_tools + pms.kill_attempts + pms.spiking_errors + pms.assists +
            pms.setting_errors + pms.kill_blocks + pms.block_touches + pms.serve_receives +
            pms.digs + pms.block_follows + pms.dives + pms.aces +
            pms.jump_serve_aces + pms.float_aces + pms.service_errors + pms.misc_errors + pms.receive_errors
          ) > 0
    ),
    strength AS (
        SELECT * FROM "public"."team_strength_ratings"(p_season_number)
    ),
    schedule AS (
        SELECT 0.5::numeric AS beta, 0.25::numeric AS factor_min, 1.75::numeric AS factor_max
    ),
    faced AS (
        SELECT p.*, COALESCE(st.rating, 0) AS opp_rating
        FROM played p
        LEFT JOIN strength st ON st.season_id = p.season_id AND st.team_id = p.opp_id
    ),
    spreads AS (
        SELECT DISTINCT st.season_id, st.spread
        FROM strength st
    ),
    season_scale AS (
        SELECT f.season_id, AVG(f.opp_rating) AS center, sp.spread
        FROM faced f
        LEFT JOIN spreads sp ON sp.season_id = f.season_id
        GROUP BY f.season_id, sp.spread
    ),
    weighted AS (
        SELECT
            f.*,
            CASE WHEN ss.spread IS NULL OR ss.spread = 0 THEN 1::numeric
                ELSE LEAST(sc.factor_max, GREATEST(sc.factor_min,
                    1 + sc.beta * (f.opp_rating - ss.center) / ss.spread))
            END AS factor
        FROM faced f
        JOIN season_scale ss ON ss.season_id = f.season_id
        CROSS JOIN schedule sc
    ),
    per_player AS (
        SELECT
            w.player_id,
            pl.roblox_user_id,
            SUM(CASE WHEN w.set_number = 5 THEN 0.5 ELSE 1 END)::numeric AS sets_played,
            SUM(w.factor * w.ape_kills) AS ape_kills, SUM(w.factor * w.delay_kills) AS delay_kills,
            SUM(w.factor * w.quick_kills) AS quick_kills, SUM(w.factor * w.wipes_tools) AS wipes_tools,
            SUM(w.kill_attempts)::int AS kill_attempts, SUM(w.spiking_errors)::int AS spiking_errors,
            SUM(w.factor * w.assists) AS assists, SUM(w.setting_errors)::int AS setting_errors,
            SUM(w.factor * w.kill_blocks) AS kill_blocks, SUM(w.factor * w.block_touches) AS block_touches,
            SUM(w.factor * (w.serve_receives + w.digs + w.block_follows + w.dives)) AS receives,
            SUM(w.factor * w.digs) AS digs,
            SUM(w.factor * (w.jump_serve_aces + w.aces)) AS jump_serve_aces, SUM(w.factor * w.float_aces) AS float_aces,
            SUM(w.service_errors)::int AS service_errors
        FROM weighted w
        JOIN "public"."players" pl ON pl.id = w.player_id
        GROUP BY w.player_id, pl.roblox_user_id
    ),
    primary_pos AS (
        SELECT DISTINCT ON (pc.player_id) pc.player_id, pc.position
        FROM (
            SELECT pms.player_id, pms.position, count(*) AS sets
            FROM "public"."player_match_stats" pms
            JOIN "public"."matches" m ON m.id = pms.match_id
            WHERE m.status = 'completed' AND pms.position IS NOT NULL
            GROUP BY pms.player_id, pms.position
        ) pc
        ORDER BY pc.player_id, pc.sets DESC, array_position(ARRAY['OUT','OPP','MID','SET','LIB'], pc.position)
    ),
    qualified AS (
        SELECT
            *,
            (ape_kills + delay_kills + quick_kills + wipes_tools) AS kills,
            (kill_blocks + block_touches) AS blocks,
            (jump_serve_aces + float_aces) AS aces
        FROM per_player
    ),
    rated AS (
        SELECT *, (kills + kill_blocks + aces) AS points, (aces - service_errors) AS net_serve
        FROM qualified
    ),
    league AS (
        SELECT
            SUM(points)::numeric / SUM(sets_played) AS points_mu,
            SUM(kills)::numeric / SUM(sets_played) AS kills_mu,
            SUM(assists)::numeric / SUM(sets_played) AS assists_mu,
            SUM(blocks)::numeric / SUM(sets_played) AS blocks_mu,
            SUM(kill_blocks)::numeric / SUM(sets_played) AS kill_blocks_mu,
            SUM(receives)::numeric / SUM(sets_played) AS receives_mu,
            SUM(digs)::numeric / SUM(sets_played) AS digs_mu,
            SUM(aces)::numeric / SUM(sets_played) AS aces_mu,
            SUM(net_serve)::numeric / SUM(sets_played) AS net_serve_mu
        FROM rated
    ),
    shrinkage AS (
        SELECT
            1.2::numeric AS points_k,
            1.2::numeric AS kills_k,
            0.1::numeric AS assists_k,
            0.6::numeric AS blocks_k,
            2.85::numeric AS kill_blocks_k,
            0.9::numeric AS receives_k,
            2.24::numeric AS digs_k,
            3.6::numeric AS aces_k,
            19.46::numeric AS net_serve_k,
            10.299::numeric AS set_assists_mu,
            1.94::numeric AS set_assists_k
    ),
    gated AS (
        SELECT
            r.player_id, r.roblox_user_id, r.sets_played,
            ROUND((r.points + sh.points_k * lg.points_mu) / (r.sets_played + sh.points_k), 3) AS points_per_set,
            ROUND((r.kills + sh.kills_k * lg.kills_mu) / (r.sets_played + sh.kills_k), 3) AS kills_per_set,
            CASE WHEN r.sets_played >= 4 AND r.kill_attempts >= 10
                THEN ROUND((r.kills - r.spiking_errors)::numeric / r.kill_attempts, 3) END AS hit_pct,
            ROUND(CASE WHEN pp.position = 'SET' AND (p_season_number IS NULL OR p_season_number >= 2)
                THEN (r.assists + sh.set_assists_k * sh.set_assists_mu) / (r.sets_played + sh.set_assists_k)
                ELSE (r.assists + sh.assists_k * lg.assists_mu) / (r.sets_played + sh.assists_k)
            END, 3) AS assists_per_set,
            CASE WHEN r.sets_played >= 4 AND (r.assists + r.setting_errors) >= 10
                THEN ROUND(r.assists::numeric / (r.assists + r.setting_errors), 3) END AS set_pct,
            ROUND((r.blocks + sh.blocks_k * lg.blocks_mu) / (r.sets_played + sh.blocks_k), 3) AS blocks_per_set,
            ROUND((r.kill_blocks + sh.kill_blocks_k * lg.kill_blocks_mu) / (r.sets_played + sh.kill_blocks_k), 3) AS kill_blocks_per_set,
            ROUND((r.receives + sh.receives_k * lg.receives_mu) / (r.sets_played + sh.receives_k), 3) AS receives_per_set,
            ROUND((r.digs + sh.digs_k * lg.digs_mu) / (r.sets_played + sh.digs_k), 3) AS digs_per_set,
            ROUND((r.aces + sh.aces_k * lg.aces_mu) / (r.sets_played + sh.aces_k), 3) AS aces_per_set,
            ROUND((r.net_serve + sh.net_serve_k * lg.net_serve_mu) / (r.sets_played + sh.net_serve_k), 3) AS net_serve_per_set
        FROM rated r
        LEFT JOIN primary_pos pp ON pp.player_id = r.player_id
        CROSS JOIN league lg
        CROSS JOIN shrinkage sh
    ),
    ranked AS (
        SELECT
            player_id, roblox_user_id, sets_played,
            points_per_set, kills_per_set, assists_per_set, blocks_per_set,
            receives_per_set, digs_per_set, aces_per_set, net_serve_per_set,
            PERCENT_RANK() OVER (ORDER BY points_per_set) AS points_per_set_rank,
            PERCENT_RANK() OVER (ORDER BY kills_per_set) AS kills_per_set_rank,
            CASE WHEN hit_pct IS NULL THEN NULL ELSE
                PERCENT_RANK() OVER (PARTITION BY (hit_pct IS NOT NULL) ORDER BY hit_pct) END AS hit_pct_rank,
            PERCENT_RANK() OVER (ORDER BY assists_per_set) AS assists_per_set_rank,
            CASE WHEN set_pct IS NULL THEN NULL ELSE
                PERCENT_RANK() OVER (PARTITION BY (set_pct IS NOT NULL) ORDER BY set_pct) END AS set_pct_rank,
            PERCENT_RANK() OVER (ORDER BY blocks_per_set) AS blocks_per_set_rank,
            PERCENT_RANK() OVER (ORDER BY kill_blocks_per_set) AS kill_blocks_per_set_rank,
            PERCENT_RANK() OVER (ORDER BY receives_per_set) AS receives_per_set_rank,
            PERCENT_RANK() OVER (ORDER BY digs_per_set) AS digs_per_set_rank,
            PERCENT_RANK() OVER (ORDER BY aces_per_set) AS aces_per_set_rank,
            PERCENT_RANK() OVER (ORDER BY net_serve_per_set) AS net_serve_per_set_rank
        FROM gated
    )
    SELECT
        player_id, roblox_user_id, sets_played,
        points_per_set, kills_per_set, assists_per_set, blocks_per_set,
        receives_per_set, digs_per_set, aces_per_set, net_serve_per_set,
        points_per_set_rank::numeric AS scoring_rank,
        (PERCENT_RANK() OVER (ORDER BY (kills_per_set_rank + COALESCE(hit_pct_rank, 0)) / 2))::numeric AS spiking_rank,
        (PERCENT_RANK() OVER (ORDER BY (assists_per_set_rank + COALESCE(set_pct_rank, 0)) / 2))::numeric AS setting_rank,
        (PERCENT_RANK() OVER (ORDER BY (blocks_per_set_rank + 2 * kill_blocks_per_set_rank) / 3))::numeric AS blocking_rank,
        (PERCENT_RANK() OVER (ORDER BY (receives_per_set_rank + digs_per_set_rank) / 2))::numeric AS receiving_rank,
        (PERCENT_RANK() OVER (ORDER BY (aces_per_set_rank + net_serve_per_set_rank) / 2))::numeric AS serving_rank
    FROM ranked
$$;

ALTER FUNCTION "public"."player_category_ranks"(integer) OWNER TO "postgres";

GRANT EXECUTE ON FUNCTION "public"."player_category_ranks"(integer) TO "anon";
GRANT EXECUTE ON FUNCTION "public"."player_category_ranks"(integer) TO "authenticated";
GRANT EXECUTE ON FUNCTION "public"."player_category_ranks"(integer) TO "service_role";
