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
    "service_errors_min" integer, "service_errors_max" integer, "service_errors_mean" numeric
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
            SUM(pms.jump_serve_aces)::int AS jump_serve_aces, SUM(pms.float_aces)::int AS float_aces,
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
        MIN(service_errors), MAX(service_errors), ROUND(AVG(service_errors), 2)
    FROM per_player;
$$;

ALTER FUNCTION "public"."get_raw_stat_summary"(integer) OWNER TO "postgres";

GRANT EXECUTE ON FUNCTION "public"."get_raw_stat_summary"(integer) TO "anon";
GRANT EXECUTE ON FUNCTION "public"."get_raw_stat_summary"(integer) TO "authenticated";
GRANT EXECUTE ON FUNCTION "public"."get_raw_stat_summary"(integer) TO "service_role";
