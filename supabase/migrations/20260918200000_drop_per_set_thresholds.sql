DROP FUNCTION IF EXISTS "public"."get_raw_stat_summary"(integer);

CREATE FUNCTION "public"."get_raw_stat_summary"("p_season_number" integer DEFAULT NULL)
RETURNS TABLE (
    "sets_played_min" numeric, "sets_played_max" numeric, "sets_played_mean" numeric,
    "ape_kills_min" integer, "ape_kills_max" integer, "ape_kills_mean" numeric,
    "ape_attempts_min" integer, "ape_attempts_max" integer, "ape_attempts_mean" numeric,
    "delay_kills_min" integer, "delay_kills_max" integer, "delay_kills_mean" numeric,
    "quick_kills_min" integer, "quick_kills_max" integer, "quick_kills_mean" numeric,
    "wipes_tools_min" integer, "wipes_tools_max" integer, "wipes_tools_mean" numeric,
    "kill_attempts_min" integer, "kill_attempts_max" integer, "kill_attempts_mean" numeric,
    "spiking_errors_min" integer, "spiking_errors_max" integer, "spiking_errors_mean" numeric,
    "assists_min" integer, "assists_max" integer, "assists_mean" numeric,
    "setting_errors_min" integer, "setting_errors_max" integer, "setting_errors_mean" numeric,
    "kill_blocks_min" integer, "kill_blocks_max" integer, "kill_blocks_mean" numeric,
    "block_touches_min" integer, "block_touches_max" integer, "block_touches_mean" numeric,
    "receives_min" integer, "receives_max" integer, "receives_mean" numeric,
    "digs_min" integer, "digs_max" integer, "digs_mean" numeric,
    "block_follows_min" integer, "block_follows_max" integer, "block_follows_mean" numeric,
    "dives_min" integer, "dives_max" integer, "dives_mean" numeric,
    "receive_errors_min" integer, "receive_errors_max" integer, "receive_errors_mean" numeric,
    "jump_serve_aces_min" integer, "jump_serve_aces_max" integer, "jump_serve_aces_mean" numeric,
    "float_aces_min" integer, "float_aces_max" integer, "float_aces_mean" numeric,
    "service_errors_min" integer, "service_errors_max" integer, "service_errors_mean" numeric,

    "points_per_set_min" numeric, "points_per_set_max" numeric, "points_per_set_mean" numeric,
    "kills_per_set_min" numeric, "kills_per_set_max" numeric, "kills_per_set_mean" numeric,
    "hit_pct_min" numeric, "hit_pct_max" numeric, "hit_pct_mean" numeric,
    "assists_per_set_min" numeric, "assists_per_set_max" numeric, "assists_per_set_mean" numeric,
    "set_pct_min" numeric, "set_pct_max" numeric, "set_pct_mean" numeric,
    "blocks_per_set_min" numeric, "blocks_per_set_max" numeric, "blocks_per_set_mean" numeric,
    "kb_pct_min" numeric, "kb_pct_max" numeric, "kb_pct_mean" numeric,
    "receives_per_set_min" numeric, "receives_per_set_max" numeric, "receives_per_set_mean" numeric,
    "rec_pct_min" numeric, "rec_pct_max" numeric, "rec_pct_mean" numeric,
    "aces_per_set_min" numeric, "aces_per_set_max" numeric, "aces_per_set_mean" numeric
)
LANGUAGE "sql" STABLE
AS $$
    WITH per_player AS (
        SELECT
            pms.player_id,
            SUM(CASE WHEN pms.set_number = 5 THEN 0.5 ELSE 1 END)::numeric AS sets_played,
            SUM(pms.ape_kills)::int AS ape_kills, SUM(pms.ape_attempts)::int AS ape_attempts,
            SUM(pms.delay_kills)::int AS delay_kills, SUM(pms.quick_kills)::int AS quick_kills,
            SUM(pms.wipes_tools)::int AS wipes_tools, SUM(pms.kill_attempts)::int AS kill_attempts,
            SUM(pms.spiking_errors)::int AS spiking_errors,
            SUM(pms.assists)::int AS assists, SUM(pms.setting_errors)::int AS setting_errors,
            SUM(pms.kill_blocks)::int AS kill_blocks, SUM(pms.block_touches)::int AS block_touches,
            SUM(pms.serve_receives + pms.digs + pms.block_follows + pms.dives)::int AS receives,
            SUM(pms.digs)::int AS digs, SUM(pms.block_follows)::int AS block_follows,
            SUM(pms.dives)::int AS dives, SUM(pms.receive_errors)::int AS receive_errors,
            SUM(pms.jump_serve_aces + pms.aces)::int AS jump_serve_aces, SUM(pms.float_aces)::int AS float_aces,
            SUM(pms.service_errors)::int AS service_errors
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
        GROUP BY pms.player_id
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
        SELECT *, (kills + kill_blocks + aces) AS points
        FROM qualified
    ),
    gated AS (
        SELECT
            *,
            ROUND(points::numeric / sets_played, 3) AS points_per_set,
            ROUND(kills::numeric / sets_played, 3) AS kills_per_set,
            CASE WHEN sets_played >= 6 AND kills >= 10 AND kill_attempts > 0
                THEN ROUND((kills - spiking_errors)::numeric / kill_attempts, 3) END AS hit_pct,
            ROUND(assists::numeric / sets_played, 3) AS assists_per_set,
            CASE WHEN sets_played >= 6 AND assists >= 10 AND (assists + setting_errors) > 0
                THEN ROUND(assists::numeric / (assists + setting_errors), 3) END AS set_pct,
            ROUND(blocks::numeric / sets_played, 3) AS blocks_per_set,
            CASE WHEN sets_played >= 6 AND blocks >= 10
                THEN ROUND(kill_blocks::numeric / blocks, 3) END AS kb_pct,
            ROUND(receives::numeric / sets_played, 3) AS receives_per_set,
            CASE WHEN sets_played >= 6 AND receives >= 10 AND (receives + receive_errors) > 0
                THEN ROUND((receives - receive_errors)::numeric / (receives + receive_errors), 3) END AS rec_pct,
            ROUND(aces::numeric / sets_played, 3) AS aces_per_set
        FROM rated
    )
    SELECT
        MIN(sets_played), MAX(sets_played), ROUND(AVG(sets_played), 2),
        MIN(ape_kills), MAX(ape_kills), ROUND(AVG(ape_kills), 2),
        MIN(ape_attempts), MAX(ape_attempts), ROUND(AVG(ape_attempts), 2),
        MIN(delay_kills), MAX(delay_kills), ROUND(AVG(delay_kills), 2),
        MIN(quick_kills), MAX(quick_kills), ROUND(AVG(quick_kills), 2),
        MIN(wipes_tools), MAX(wipes_tools), ROUND(AVG(wipes_tools), 2),
        MIN(kill_attempts), MAX(kill_attempts), ROUND(AVG(kill_attempts), 2),
        MIN(spiking_errors), MAX(spiking_errors), ROUND(AVG(spiking_errors), 2),
        MIN(assists), MAX(assists), ROUND(AVG(assists), 2),
        MIN(setting_errors), MAX(setting_errors), ROUND(AVG(setting_errors), 2),
        MIN(kill_blocks), MAX(kill_blocks), ROUND(AVG(kill_blocks), 2),
        MIN(block_touches), MAX(block_touches), ROUND(AVG(block_touches), 2),
        MIN(receives), MAX(receives), ROUND(AVG(receives), 2),
        MIN(digs), MAX(digs), ROUND(AVG(digs), 2),
        MIN(block_follows), MAX(block_follows), ROUND(AVG(block_follows), 2),
        MIN(dives), MAX(dives), ROUND(AVG(dives), 2),
        MIN(receive_errors), MAX(receive_errors), ROUND(AVG(receive_errors), 2),
        MIN(jump_serve_aces), MAX(jump_serve_aces), ROUND(AVG(jump_serve_aces), 2),
        MIN(float_aces), MAX(float_aces), ROUND(AVG(float_aces), 2),
        MIN(service_errors), MAX(service_errors), ROUND(AVG(service_errors), 2),
        MIN(points_per_set), MAX(points_per_set), ROUND(AVG(points_per_set), 3),
        MIN(kills_per_set), MAX(kills_per_set), ROUND(AVG(kills_per_set), 3),
        MIN(hit_pct), MAX(hit_pct), ROUND(AVG(hit_pct), 3),
        MIN(assists_per_set), MAX(assists_per_set), ROUND(AVG(assists_per_set), 3),
        MIN(set_pct), MAX(set_pct), ROUND(AVG(set_pct), 3),
        MIN(blocks_per_set), MAX(blocks_per_set), ROUND(AVG(blocks_per_set), 3),
        MIN(kb_pct), MAX(kb_pct), ROUND(AVG(kb_pct), 3),
        MIN(receives_per_set), MAX(receives_per_set), ROUND(AVG(receives_per_set), 3),
        MIN(rec_pct), MAX(rec_pct), ROUND(AVG(rec_pct), 3),
        MIN(aces_per_set), MAX(aces_per_set), ROUND(AVG(aces_per_set), 3)
    FROM gated;
$$;

ALTER FUNCTION "public"."get_raw_stat_summary"(integer) OWNER TO "postgres";

GRANT EXECUTE ON FUNCTION "public"."get_raw_stat_summary"(integer) TO "anon";
GRANT EXECUTE ON FUNCTION "public"."get_raw_stat_summary"(integer) TO "authenticated";
GRANT EXECUTE ON FUNCTION "public"."get_raw_stat_summary"(integer) TO "service_role";

DROP FUNCTION IF EXISTS "public"."get_player_stat_ranks"(text, integer);

CREATE FUNCTION "public"."get_player_stat_ranks"(
    "p_roblox_user_id" text,
    "p_season_number" integer DEFAULT NULL
)
RETURNS TABLE (
    "points_per_set_rank" numeric,
    "kills_per_set_rank" numeric,
    "hit_pct_rank" numeric,
    "assists_per_set_rank" numeric,
    "set_pct_rank" numeric,
    "blocks_per_set_rank" numeric,
    "kb_pct_rank" numeric,
    "receives_per_set_rank" numeric,
    "rec_pct_rank" numeric,
    "aces_per_set_rank" numeric
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
            SUM(pms.receive_errors)::int AS receive_errors,
            SUM(pms.jump_serve_aces + pms.aces)::int AS jump_serve_aces, SUM(pms.float_aces)::int AS float_aces
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
    qualified AS (
        SELECT
            *,
            (ape_kills + delay_kills + quick_kills + wipes_tools) AS kills,
            (kill_blocks + block_touches) AS blocks,
            (jump_serve_aces + float_aces) AS aces
        FROM per_player
    ),
    rated AS (
        SELECT *, (kills + kill_blocks + aces) AS points
        FROM qualified
    ),
    gated AS (
        SELECT
            player_id, roblox_user_id,
            ROUND(points::numeric / sets_played, 3) AS points_per_set,
            ROUND(kills::numeric / sets_played, 3) AS kills_per_set,
            CASE WHEN sets_played >= 6 AND kills >= 10 AND kill_attempts > 0
                THEN ROUND((kills - spiking_errors)::numeric / kill_attempts, 3) END AS hit_pct,
            ROUND(assists::numeric / sets_played, 3) AS assists_per_set,
            CASE WHEN sets_played >= 6 AND assists >= 10 AND (assists + setting_errors) > 0
                THEN ROUND(assists::numeric / (assists + setting_errors), 3) END AS set_pct,
            ROUND(blocks::numeric / sets_played, 3) AS blocks_per_set,
            CASE WHEN sets_played >= 6 AND blocks >= 10
                THEN ROUND(kill_blocks::numeric / blocks, 3) END AS kb_pct,
            ROUND(receives::numeric / sets_played, 3) AS receives_per_set,
            CASE WHEN sets_played >= 6 AND receives >= 10 AND (receives + receive_errors) > 0
                THEN ROUND((receives - receive_errors)::numeric / (receives + receive_errors), 3) END AS rec_pct,
            ROUND(aces::numeric / sets_played, 3) AS aces_per_set
        FROM rated
    ),
    ranked AS (
        SELECT
            player_id, roblox_user_id,
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
            CASE WHEN rec_pct IS NULL THEN NULL ELSE
                PERCENT_RANK() OVER (PARTITION BY (rec_pct IS NOT NULL) ORDER BY rec_pct) END AS rec_pct_rank,
            PERCENT_RANK() OVER (ORDER BY aces_per_set) AS aces_per_set_rank
        FROM gated
    )
    SELECT
        r.points_per_set_rank, r.kills_per_set_rank, r.hit_pct_rank, r.assists_per_set_rank, r.set_pct_rank,
        r.blocks_per_set_rank, r.kb_pct_rank, r.receives_per_set_rank, r.rec_pct_rank, r.aces_per_set_rank
    FROM (SELECT p_roblox_user_id::bigint AS roblox_user_id) target
    LEFT JOIN ranked r ON r.roblox_user_id = target.roblox_user_id
$$;

ALTER FUNCTION "public"."get_player_stat_ranks"(text, integer) OWNER TO "postgres";

GRANT EXECUTE ON FUNCTION "public"."get_player_stat_ranks"(text, integer) TO "anon";
GRANT EXECUTE ON FUNCTION "public"."get_player_stat_ranks"(text, integer) TO "authenticated";
GRANT EXECUTE ON FUNCTION "public"."get_player_stat_ranks"(text, integer) TO "service_role";
