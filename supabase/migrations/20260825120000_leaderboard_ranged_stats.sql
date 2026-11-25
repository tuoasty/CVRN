CREATE OR REPLACE FUNCTION "public"."get_player_season_stats_ranged"(
  "p_season_id" "uuid" DEFAULT NULL,
  "p_from" timestamp with time zone DEFAULT NULL,
  "p_to" timestamp with time zone DEFAULT NULL
)
RETURNS TABLE (
  "player_id" "uuid",
  "season_id" "uuid",
  "sets_played" integer,
  "matches_played" integer,
  "ape_kills_per_set" numeric,
  "ape_attempts_per_set" numeric,
  "delay_kills_per_set" numeric,
  "quick_kills_per_set" numeric,
  "wipes_tools_per_set" numeric,
  "kills_per_set" numeric,
  "kill_attempts_per_set" numeric,
  "spiking_errors_per_set" numeric,
  "assists_per_set" numeric,
  "setting_errors_per_set" numeric,
  "kill_blocks_per_set" numeric,
  "block_touches_per_set" numeric,
  "blocks_per_set" numeric,
  "serve_receives_per_set" numeric,
  "digs_per_set" numeric,
  "block_follows_per_set" numeric,
  "dives_per_set" numeric,
  "receives_per_set" numeric,
  "aces_per_set" numeric,
  "service_errors_per_set" numeric,
  "service_score" integer,
  "misc_errors_per_set" numeric,
  "errors_per_set" numeric,
  "hit_eff" numeric,
  "kb_pct" numeric,
  "set_eff" numeric,
  "points_total" integer,
  "points_per_set" numeric,
  "kill_blocks_total" integer,
  "block_touches_total" integer,
  "assists_total" integer,
  "setting_errors_total" integer,
  "serve_receives_total" integer,
  "digs_total" integer,
  "block_follows_total" integer,
  "dives_total" integer,
  "ape_kills_total" integer,
  "delay_kills_total" integer,
  "quick_kills_total" integer,
  "wipes_tools_total" integer,
  "spiking_errors_total" integer,
  "aces_total" integer,
  "service_errors_total" integer,
  "kills_total" integer,
  "blocks_total" integer,
  "receives_total" integer,
  "kill_attempts_total" integer,
  "ape_attempts_total" integer,
  "misc_errors_total" integer,
  "receive_errors_total" integer,
  "rec_eff" numeric,
  "errors_total" integer,
  "jump_serve_aces_total" integer,
  "float_aces_total" integer,
  "jump_serve_aces_per_set" numeric,
  "float_aces_per_set" numeric
)
LANGUAGE "sql"
STABLE
AS $$
WITH raw AS (
  SELECT
    pms.player_id,
    m.season_id,
    COUNT(*)::int                             AS sets_played,
    COUNT(DISTINCT pms.match_id)::int         AS matches_played,
    SUM(pms.ape_kills)::int                   AS ape_kills_total,
    SUM(pms.ape_attempts)::int                AS ape_attempts_total,
    SUM(pms.delay_kills)::int                 AS delay_kills_total,
    SUM(pms.quick_kills)::int                 AS quick_kills_total,
    SUM(pms.wipes_tools)::int                 AS wipes_tools_total,
    SUM(pms.kill_attempts)::int               AS kill_attempts_total,
    SUM(pms.spiking_errors)::int              AS spiking_errors_total,
    SUM(pms.assists)::int                     AS assists_total,
    SUM(pms.setting_errors)::int              AS setting_errors_total,
    SUM(pms.kill_blocks)::int                 AS kill_blocks_total,
    SUM(pms.block_touches)::int               AS block_touches_total,
    SUM(pms.serve_receives)::int              AS serve_receives_total,
    SUM(pms.digs)::int                        AS digs_total,
    SUM(pms.block_follows)::int               AS block_follows_total,
    SUM(pms.dives)::int                       AS dives_total,
    SUM(pms.aces + pms.jump_serve_aces + pms.float_aces)::int AS aces_total,
    SUM(pms.jump_serve_aces)::int             AS jump_serve_aces_total,
    SUM(pms.float_aces)::int                  AS float_aces_total,
    SUM(pms.service_errors)::int              AS service_errors_total,
    SUM(pms.misc_errors)::int                 AS misc_errors_total,
    SUM(pms.receive_errors)::int              AS receive_errors_total
  FROM "public"."player_match_stats" pms
  JOIN "public"."matches" m ON m.id = pms.match_id
  WHERE m.status = 'completed'
    AND (p_season_id IS NULL OR m.season_id = p_season_id)
    AND (p_from IS NULL OR m.scheduled_at >= p_from)
    AND (p_to   IS NULL OR m.scheduled_at <  p_to)
    AND (
      pms.ape_kills + pms.ape_attempts + pms.delay_kills + pms.quick_kills +
      pms.wipes_tools + pms.kill_attempts + pms.spiking_errors + pms.assists +
      pms.setting_errors + pms.kill_blocks + pms.block_touches + pms.serve_receives +
      pms.digs + pms.block_follows + pms.dives + pms.aces +
      pms.jump_serve_aces + pms.float_aces +
      pms.service_errors + pms.misc_errors + pms.receive_errors
    ) > 0
  GROUP BY pms.player_id, m.season_id
)
SELECT
  r.player_id,
  r.season_id,
  r.sets_played,
  r.matches_played,

  ROUND(r.ape_kills_total::numeric       / r.sets_played, 2) AS ape_kills_per_set,
  ROUND(r.ape_attempts_total::numeric    / r.sets_played, 2) AS ape_attempts_per_set,
  ROUND(r.delay_kills_total::numeric     / r.sets_played, 2) AS delay_kills_per_set,
  ROUND(r.quick_kills_total::numeric     / r.sets_played, 2) AS quick_kills_per_set,
  ROUND(r.wipes_tools_total::numeric     / r.sets_played, 2) AS wipes_tools_per_set,
  ROUND((r.ape_kills_total + r.delay_kills_total + r.quick_kills_total + r.wipes_tools_total)::numeric
        / r.sets_played, 2)                                   AS kills_per_set,
  ROUND(r.kill_attempts_total::numeric   / r.sets_played, 2) AS kill_attempts_per_set,
  ROUND(r.spiking_errors_total::numeric  / r.sets_played, 2) AS spiking_errors_per_set,

  ROUND(r.assists_total::numeric         / r.sets_played, 2) AS assists_per_set,
  ROUND(r.setting_errors_total::numeric  / r.sets_played, 2) AS setting_errors_per_set,

  ROUND(r.kill_blocks_total::numeric     / r.sets_played, 2) AS kill_blocks_per_set,
  ROUND(r.block_touches_total::numeric   / r.sets_played, 2) AS block_touches_per_set,
  ROUND((r.kill_blocks_total + r.block_touches_total)::numeric
        / r.sets_played, 2)                                   AS blocks_per_set,

  ROUND(r.serve_receives_total::numeric  / r.sets_played, 2) AS serve_receives_per_set,
  ROUND(r.digs_total::numeric            / r.sets_played, 2) AS digs_per_set,
  ROUND(r.block_follows_total::numeric   / r.sets_played, 2) AS block_follows_per_set,
  ROUND(r.dives_total::numeric           / r.sets_played, 2) AS dives_per_set,
  ROUND((r.serve_receives_total + r.digs_total + r.block_follows_total + r.dives_total)::numeric
        / r.sets_played, 2)                                   AS receives_per_set,

  ROUND(r.aces_total::numeric            / r.sets_played, 2) AS aces_per_set,
  ROUND(r.service_errors_total::numeric  / r.sets_played, 2) AS service_errors_per_set,
  (r.aces_total - r.service_errors_total)                    AS service_score,

  ROUND(r.misc_errors_total::numeric     / r.sets_played, 2) AS misc_errors_per_set,
  ROUND((r.spiking_errors_total + r.setting_errors_total + r.service_errors_total + r.misc_errors_total + r.receive_errors_total)::numeric
        / r.sets_played, 2)                                   AS errors_per_set,

  CASE
    WHEN r.kill_attempts_total = 0 THEN NULL
    ELSE ROUND(
      ((r.ape_kills_total + r.delay_kills_total + r.quick_kills_total + r.wipes_tools_total)
        - r.spiking_errors_total)::numeric
      / r.kill_attempts_total, 3)
  END AS hit_eff,
  CASE
    WHEN (r.kill_blocks_total + r.block_touches_total) = 0 THEN NULL
    ELSE ROUND(r.kill_blocks_total::numeric / (r.kill_blocks_total + r.block_touches_total), 3)
  END AS kb_pct,
  CASE
    WHEN (r.assists_total + r.setting_errors_total) = 0 THEN NULL
    ELSE ROUND(r.assists_total::numeric / (r.assists_total + r.setting_errors_total), 3)
  END AS set_eff,

  (r.ape_kills_total + r.delay_kills_total + r.quick_kills_total + r.wipes_tools_total
    + r.kill_blocks_total + r.aces_total)                     AS points_total,
  ROUND((r.ape_kills_total + r.delay_kills_total + r.quick_kills_total + r.wipes_tools_total
    + r.kill_blocks_total + r.aces_total)::numeric
        / r.sets_played, 2)                                   AS points_per_set,
  r.kill_blocks_total,
  r.block_touches_total,
  r.assists_total,
  r.setting_errors_total,
  r.serve_receives_total,
  r.digs_total,
  r.block_follows_total,
  r.dives_total,
  r.ape_kills_total,
  r.delay_kills_total,
  r.quick_kills_total,
  r.wipes_tools_total,
  r.spiking_errors_total,
  r.aces_total,
  r.service_errors_total,
  (r.ape_kills_total + r.delay_kills_total + r.quick_kills_total + r.wipes_tools_total) AS kills_total,
  (r.kill_blocks_total + r.block_touches_total)                                          AS blocks_total,
  (r.serve_receives_total + r.digs_total + r.block_follows_total + r.dives_total)         AS receives_total,

  r.kill_attempts_total,
  r.ape_attempts_total,
  r.misc_errors_total,

  r.receive_errors_total,
  CASE
    WHEN (r.serve_receives_total + r.digs_total + r.block_follows_total + r.dives_total + r.receive_errors_total) = 0 THEN NULL
    ELSE ROUND(
      ((r.serve_receives_total + r.digs_total + r.block_follows_total + r.dives_total) - r.receive_errors_total)::numeric
      / (r.serve_receives_total + r.digs_total + r.block_follows_total + r.dives_total + r.receive_errors_total), 3)
  END AS rec_eff,
  (r.spiking_errors_total + r.setting_errors_total + r.service_errors_total + r.misc_errors_total + r.receive_errors_total) AS errors_total,

  r.jump_serve_aces_total,
  r.float_aces_total,
  ROUND(r.jump_serve_aces_total::numeric / r.sets_played, 2) AS jump_serve_aces_per_set,
  ROUND(r.float_aces_total::numeric      / r.sets_played, 2) AS float_aces_per_set
FROM raw r;
$$;

ALTER FUNCTION "public"."get_player_season_stats_ranged"("uuid", timestamp with time zone, timestamp with time zone) OWNER TO "postgres";

GRANT EXECUTE ON FUNCTION "public"."get_player_season_stats_ranged"("uuid", timestamp with time zone, timestamp with time zone) TO "anon";
GRANT EXECUTE ON FUNCTION "public"."get_player_season_stats_ranged"("uuid", timestamp with time zone, timestamp with time zone) TO "authenticated";
GRANT EXECUTE ON FUNCTION "public"."get_player_season_stats_ranged"("uuid", timestamp with time zone, timestamp with time zone) TO "service_role";

CREATE OR REPLACE VIEW "public"."v_player_season_stats" AS
  SELECT * FROM "public"."get_player_season_stats_ranged"();

ALTER VIEW "public"."v_player_season_stats" OWNER TO "postgres";

GRANT SELECT ON "public"."v_player_season_stats" TO "anon";
GRANT SELECT ON "public"."v_player_season_stats" TO "authenticated";
GRANT SELECT ON "public"."v_player_season_stats" TO "service_role";
