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
            CASE WHEN sets_played >= 6 AND points >= 10
                THEN ROUND(points::numeric / sets_played, 3) END AS points_per_set,
            CASE WHEN sets_played >= 6 AND kills >= 10
                THEN ROUND(kills::numeric / sets_played, 3) END AS kills_per_set,
            CASE WHEN sets_played >= 6 AND kills >= 10 AND kill_attempts > 0
                THEN ROUND((kills - spiking_errors)::numeric / kill_attempts, 3) END AS hit_pct,
            CASE WHEN sets_played >= 6 AND assists >= 10
                THEN ROUND(assists::numeric / sets_played, 3) END AS assists_per_set,
            CASE WHEN sets_played >= 6 AND assists >= 10 AND (assists + setting_errors) > 0
                THEN ROUND(assists::numeric / (assists + setting_errors), 3) END AS set_pct,
            CASE WHEN sets_played >= 6 AND blocks >= 10
                THEN ROUND(blocks::numeric / sets_played, 3) END AS blocks_per_set,
            CASE WHEN sets_played >= 6 AND blocks >= 10
                THEN ROUND(kill_blocks::numeric / blocks, 3) END AS kb_pct,
            CASE WHEN sets_played >= 6 AND receives >= 10
                THEN ROUND(receives::numeric / sets_played, 3) END AS receives_per_set,
            CASE WHEN sets_played >= 6 AND receives >= 10 AND (receives + receive_errors) > 0
                THEN ROUND((receives - receive_errors)::numeric / (receives + receive_errors), 3) END AS rec_pct,
            CASE WHEN sets_played >= 6 AND aces >= 5
                THEN ROUND(aces::numeric / sets_played, 3) END AS aces_per_set
        FROM rated
    ),
    ranked AS (
        SELECT
            player_id, roblox_user_id,
            CASE WHEN points_per_set IS NULL THEN NULL ELSE
                PERCENT_RANK() OVER (PARTITION BY (points_per_set IS NOT NULL) ORDER BY points_per_set) END AS points_per_set_rank,
            CASE WHEN kills_per_set IS NULL THEN NULL ELSE
                PERCENT_RANK() OVER (PARTITION BY (kills_per_set IS NOT NULL) ORDER BY kills_per_set) END AS kills_per_set_rank,
            CASE WHEN hit_pct IS NULL THEN NULL ELSE
                PERCENT_RANK() OVER (PARTITION BY (hit_pct IS NOT NULL) ORDER BY hit_pct) END AS hit_pct_rank,
            CASE WHEN assists_per_set IS NULL THEN NULL ELSE
                PERCENT_RANK() OVER (PARTITION BY (assists_per_set IS NOT NULL) ORDER BY assists_per_set) END AS assists_per_set_rank,
            CASE WHEN set_pct IS NULL THEN NULL ELSE
                PERCENT_RANK() OVER (PARTITION BY (set_pct IS NOT NULL) ORDER BY set_pct) END AS set_pct_rank,
            CASE WHEN blocks_per_set IS NULL THEN NULL ELSE
                PERCENT_RANK() OVER (PARTITION BY (blocks_per_set IS NOT NULL) ORDER BY blocks_per_set) END AS blocks_per_set_rank,
            CASE WHEN kb_pct IS NULL THEN NULL ELSE
                PERCENT_RANK() OVER (PARTITION BY (kb_pct IS NOT NULL) ORDER BY kb_pct) END AS kb_pct_rank,
            CASE WHEN receives_per_set IS NULL THEN NULL ELSE
                PERCENT_RANK() OVER (PARTITION BY (receives_per_set IS NOT NULL) ORDER BY receives_per_set) END AS receives_per_set_rank,
            CASE WHEN rec_pct IS NULL THEN NULL ELSE
                PERCENT_RANK() OVER (PARTITION BY (rec_pct IS NOT NULL) ORDER BY rec_pct) END AS rec_pct_rank,
            CASE WHEN aces_per_set IS NULL THEN NULL ELSE
                PERCENT_RANK() OVER (PARTITION BY (aces_per_set IS NOT NULL) ORDER BY aces_per_set) END AS aces_per_set_rank
        FROM gated
    )
    SELECT
        points_per_set_rank, kills_per_set_rank, hit_pct_rank, assists_per_set_rank, set_pct_rank,
        blocks_per_set_rank, kb_pct_rank, receives_per_set_rank, rec_pct_rank, aces_per_set_rank
    FROM ranked
    WHERE roblox_user_id = p_roblox_user_id::bigint
$$;

ALTER FUNCTION "public"."get_player_stat_ranks"(text, integer) OWNER TO "postgres";

GRANT EXECUTE ON FUNCTION "public"."get_player_stat_ranks"(text, integer) TO "anon";
GRANT EXECUTE ON FUNCTION "public"."get_player_stat_ranks"(text, integer) TO "authenticated";
GRANT EXECUTE ON FUNCTION "public"."get_player_stat_ranks"(text, integer) TO "service_role";
