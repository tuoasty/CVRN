CREATE FUNCTION "public"."get_player_raw_stat_totals"(
    "p_roblox_user_id" bigint,
    "p_season_number" integer DEFAULT NULL
)
RETURNS TABLE (
    "sets_played" numeric,
    "ape_kills" integer, "ape_attempts" integer, "delay_kills" integer, "quick_kills" integer,
    "wipes_tools" integer, "kill_attempts" integer, "spiking_errors" integer,
    "assists" integer, "setting_errors" integer,
    "kill_blocks" integer, "block_touches" integer,
    "digs" integer, "block_follows" integer, "dives" integer, "receive_errors" integer, "receives" integer,
    "jump_serve_aces" integer, "float_aces" integer, "service_errors" integer
)
LANGUAGE "sql" STABLE
AS $$
    SELECT
        COALESCE(SUM(CASE WHEN pms.set_number = 5 THEN 0.5 ELSE 1 END), 0)::numeric,
        COALESCE(SUM(pms.ape_kills), 0)::int, COALESCE(SUM(pms.ape_attempts), 0)::int,
        COALESCE(SUM(pms.delay_kills), 0)::int, COALESCE(SUM(pms.quick_kills), 0)::int,
        COALESCE(SUM(pms.wipes_tools), 0)::int, COALESCE(SUM(pms.kill_attempts), 0)::int,
        COALESCE(SUM(pms.spiking_errors), 0)::int,
        COALESCE(SUM(pms.assists), 0)::int, COALESCE(SUM(pms.setting_errors), 0)::int,
        COALESCE(SUM(pms.kill_blocks), 0)::int, COALESCE(SUM(pms.block_touches), 0)::int,
        COALESCE(SUM(pms.digs), 0)::int, COALESCE(SUM(pms.block_follows), 0)::int,
        COALESCE(SUM(pms.dives), 0)::int, COALESCE(SUM(pms.receive_errors), 0)::int,
        COALESCE(SUM(pms.serve_receives + pms.digs + pms.block_follows + pms.dives), 0)::int,
        COALESCE(SUM(pms.jump_serve_aces), 0)::int, COALESCE(SUM(pms.float_aces), 0)::int,
        COALESCE(SUM(pms.service_errors), 0)::int
    FROM "public"."player_match_stats" pms
    JOIN "public"."players" pl ON pl.id = pms.player_id
    JOIN "public"."matches" m ON m.id = pms.match_id
    JOIN "public"."seasons" s ON s.id = m.season_id
    WHERE pl.roblox_user_id = p_roblox_user_id
      AND m.status = 'completed'
      AND (p_season_number IS NULL OR s.season_number = p_season_number)
      AND (
        pms.ape_kills + pms.ape_attempts + pms.delay_kills + pms.quick_kills +
        pms.wipes_tools + pms.kill_attempts + pms.spiking_errors + pms.assists +
        pms.setting_errors + pms.kill_blocks + pms.block_touches + pms.serve_receives +
        pms.digs + pms.block_follows + pms.dives + pms.aces +
        pms.jump_serve_aces + pms.float_aces + pms.service_errors + pms.misc_errors + pms.receive_errors
      ) > 0
$$;

ALTER FUNCTION "public"."get_player_raw_stat_totals"(bigint, integer) OWNER TO "postgres";

GRANT EXECUTE ON FUNCTION "public"."get_player_raw_stat_totals"(bigint, integer) TO "anon";
GRANT EXECUTE ON FUNCTION "public"."get_player_raw_stat_totals"(bigint, integer) TO "authenticated";
GRANT EXECUTE ON FUNCTION "public"."get_player_raw_stat_totals"(bigint, integer) TO "service_role";
