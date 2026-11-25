DROP FUNCTION IF EXISTS "public"."get_player_stat_ranks"(text, integer);

CREATE FUNCTION "public"."get_player_stat_ranks"(
    "p_roblox_user_id" text,
    "p_season_number" integer DEFAULT NULL
)
RETURNS TABLE (
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
    WITH per_player AS (
        SELECT
            pms.player_id,
            pl.roblox_user_id,
            SUM(CASE WHEN pms.set_number = 5 THEN 0.5 ELSE 1 END)::numeric AS sets_played,
            SUM(pms.ape_kills)::int AS ape_kills, SUM(pms.delay_kills)::int AS delay_kills,
            SUM(pms.quick_kills)::int AS quick_kills, SUM(pms.wipes_tools)::int AS wipes_tools,
            SUM(pms.kill_attempts)::int AS kill_attempts, SUM(pms.spiking_errors)::int AS spiking_errors,
            SUM(pms.assists)::int AS assists, SUM(pms.setting_errors)::int AS setting_errors,
            SUM(pms.kill_blocks)::int AS kill_blocks, SUM(pms.block_touches)::int AS block_touches,
            SUM(pms.serve_receives + pms.digs + pms.block_follows + pms.dives)::int AS receives,
            SUM(pms.digs)::int AS digs,
            SUM(pms.jump_serve_aces + pms.aces)::int AS jump_serve_aces, SUM(pms.float_aces)::int AS float_aces,
            SUM(pms.service_errors)::int AS service_errors
        FROM "public"."player_match_stats" pms
        JOIN "public"."players" pl ON pl.id = pms.player_id
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
        GROUP BY pms.player_id, pl.roblox_user_id
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
            0.9::numeric AS receives_k,
            2.24::numeric AS digs_k,
            3.6::numeric AS aces_k,
            19.46::numeric AS net_serve_k,
            10.299::numeric AS set_assists_mu,
            1.94::numeric AS set_assists_k
    ),
    gated AS (
        SELECT
            r.player_id, r.roblox_user_id,
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
            CASE WHEN r.sets_played >= 4 AND r.blocks >= 5
                THEN ROUND(r.kill_blocks::numeric / r.blocks, 3) END AS kb_pct,
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
            player_id, roblox_user_id,
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
            CASE WHEN kb_pct IS NULL THEN NULL ELSE
                PERCENT_RANK() OVER (PARTITION BY (kb_pct IS NOT NULL) ORDER BY kb_pct) END AS kb_pct_rank,
            PERCENT_RANK() OVER (ORDER BY receives_per_set) AS receives_per_set_rank,
            PERCENT_RANK() OVER (ORDER BY digs_per_set) AS digs_per_set_rank,
            PERCENT_RANK() OVER (ORDER BY aces_per_set) AS aces_per_set_rank,
            PERCENT_RANK() OVER (ORDER BY net_serve_per_set) AS net_serve_per_set_rank
        FROM gated
    ),
    combined AS (
        SELECT
            roblox_user_id,
            points_per_set, kills_per_set, assists_per_set, blocks_per_set,
            receives_per_set, digs_per_set, aces_per_set, net_serve_per_set,
            points_per_set_rank AS scoring_rank,
            PERCENT_RANK() OVER (ORDER BY (kills_per_set_rank + COALESCE(hit_pct_rank, 0)) / 2) AS spiking_rank,
            PERCENT_RANK() OVER (ORDER BY (assists_per_set_rank + COALESCE(set_pct_rank, 0)) / 2) AS setting_rank,
            PERCENT_RANK() OVER (ORDER BY (blocks_per_set_rank + COALESCE(kb_pct_rank, 0)) / 2) AS blocking_rank,
            PERCENT_RANK() OVER (ORDER BY (receives_per_set_rank + digs_per_set_rank) / 2) AS receiving_rank,
            PERCENT_RANK() OVER (ORDER BY (aces_per_set_rank + net_serve_per_set_rank) / 2) AS serving_rank
        FROM ranked
    )
    SELECT
        c.points_per_set, c.kills_per_set, c.assists_per_set, c.blocks_per_set,
        c.receives_per_set, c.digs_per_set, c.aces_per_set, c.net_serve_per_set,
        c.scoring_rank, c.spiking_rank, c.setting_rank, c.blocking_rank, c.receiving_rank, c.serving_rank
    FROM (SELECT p_roblox_user_id::bigint AS roblox_user_id) target
    LEFT JOIN combined c ON c.roblox_user_id = target.roblox_user_id
$$;

ALTER FUNCTION "public"."get_player_stat_ranks"(text, integer) OWNER TO "postgres";

GRANT EXECUTE ON FUNCTION "public"."get_player_stat_ranks"(text, integer) TO "anon";
GRANT EXECUTE ON FUNCTION "public"."get_player_stat_ranks"(text, integer) TO "authenticated";
GRANT EXECUTE ON FUNCTION "public"."get_player_stat_ranks"(text, integer) TO "service_role";
