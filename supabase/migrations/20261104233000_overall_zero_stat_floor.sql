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

CREATE OR REPLACE FUNCTION "public"."get_overall_inputs"(
    "p_season_number" integer
)
RETURNS TABLE (
    "player_id" uuid,
    "roblox_user_id" text,
    "username" text,
    "display_name" text,
    "avatar_url" text,
    "region_code" text,
    "team_id" uuid,
    "team_name" text,
    "team_logo_url" text,
    "position" text,
    "sets_played" numeric,
    "scoring_rank" numeric,
    "spiking_rank" numeric,
    "setting_rank" numeric,
    "blocking_rank" numeric,
    "receiving_rank" numeric,
    "serving_rank" numeric
)
LANGUAGE "sql" STABLE
AS $$
    WITH season_stats AS (
        SELECT pms.player_id, m.season_id, pms.position, count(*) AS sets
        FROM "public"."player_match_stats" pms
        JOIN "public"."matches" m ON m.id = pms.match_id
        JOIN "public"."seasons" s ON s.id = m.season_id
        WHERE s.season_number = p_season_number AND m.status = 'completed'
        GROUP BY pms.player_id, m.season_id, pms.position
    ),
    season_players AS (
        SELECT DISTINCT player_id FROM season_stats
    ),
    season_totals AS (
        SELECT
            pms.player_id,
            SUM(pms.ape_kills + pms.delay_kills + pms.quick_kills + pms.wipes_tools) AS kills,
            SUM(pms.assists) AS assists,
            SUM(pms.kill_blocks) AS kill_blocks,
            SUM(pms.block_touches) AS block_touches,
            SUM(pms.serve_receives + pms.digs + pms.block_follows + pms.dives) AS receives,
            SUM(pms.jump_serve_aces + pms.aces + pms.float_aces) AS aces
        FROM "public"."player_match_stats" pms
        JOIN "public"."matches" m ON m.id = pms.match_id
        JOIN "public"."seasons" s ON s.id = m.season_id
        WHERE s.season_number = p_season_number AND m.status = 'completed'
        GROUP BY pms.player_id
    ),
    stat_pos AS (
        SELECT DISTINCT ON (x.player_id) x.player_id, x.position
        FROM (
            SELECT player_id, position, sum(sets) AS sets
            FROM season_stats
            WHERE position IS NOT NULL
            GROUP BY player_id, position
        ) x
        ORDER BY x.player_id, x.sets DESC, array_position(ARRAY['OUT','OPP','MID','SET','LIB'], x.position)
    ),
    home_season AS (
        SELECT DISTINCT ON (x.player_id) x.player_id, x.season_id
        FROM (
            SELECT player_id, season_id, sum(sets) AS sets
            FROM season_stats
            GROUP BY player_id, season_id
        ) x
        ORDER BY x.player_id, x.sets DESC, x.season_id
    ),
    roster AS (
        SELECT DISTINCT ON (pts.player_id) pts.player_id, pts.team_id, pts.position
        FROM "public"."player_team_seasons" pts
        JOIN home_season hs ON hs.player_id = pts.player_id AND hs.season_id = pts.season_id
        ORDER BY pts.player_id, (pts.left_at IS NULL) DESC, pts.joined_at DESC
    )
    SELECT
        cr.player_id,
        cr.roblox_user_id::text,
        pl.username,
        pl.display_name,
        pl.avatar_url,
        r.code,
        t.id,
        t.name,
        t.logo_url,
        COALESCE(sp.position, ro.position),
        cr.sets_played,
        CASE WHEN tot.kills + tot.kill_blocks + tot.aces > 0 THEN cr.scoring_rank ELSE 0 END,
        CASE WHEN tot.kills > 0 THEN cr.spiking_rank ELSE 0 END,
        CASE WHEN tot.assists > 0 THEN cr.setting_rank ELSE 0 END,
        CASE WHEN tot.kill_blocks + tot.block_touches > 0 THEN cr.blocking_rank ELSE 0 END,
        CASE WHEN tot.receives > 0 THEN cr.receiving_rank ELSE 0 END,
        CASE WHEN tot.aces > 0 THEN cr.serving_rank ELSE 0 END
    FROM "public"."player_category_ranks"(p_season_number) cr
    JOIN season_players spl ON spl.player_id = cr.player_id
    JOIN season_totals tot ON tot.player_id = cr.player_id
    JOIN "public"."players" pl ON pl.id = cr.player_id
    LEFT JOIN home_season hs ON hs.player_id = cr.player_id
    LEFT JOIN "public"."seasons" hss ON hss.id = hs.season_id
    LEFT JOIN "public"."regions" r ON r.id = hss.region_id
    LEFT JOIN roster ro ON ro.player_id = cr.player_id
    LEFT JOIN "public"."teams" t ON t.id = ro.team_id
    LEFT JOIN stat_pos sp ON sp.player_id = cr.player_id
$$;

ALTER FUNCTION "public"."get_overall_inputs"(integer) OWNER TO "postgres";
GRANT EXECUTE ON FUNCTION "public"."get_overall_inputs"(integer) TO "anon";
GRANT EXECUTE ON FUNCTION "public"."get_overall_inputs"(integer) TO "authenticated";
GRANT EXECUTE ON FUNCTION "public"."get_overall_inputs"(integer) TO "service_role";
