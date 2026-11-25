
CREATE OR REPLACE VIEW "public"."v_player_season_stats" AS
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
    SUM(pms.aces)::int                        AS aces_total,
    SUM(pms.service_errors)::int              AS service_errors_total,
    SUM(pms.misc_errors)::int                 AS misc_errors_total
  FROM "public"."player_match_stats" pms
  JOIN "public"."matches" m ON m.id = pms.match_id
  WHERE m.status = 'completed'
    AND (
      pms.ape_kills + pms.ape_attempts + pms.delay_kills + pms.quick_kills +
      pms.wipes_tools + pms.kill_attempts + pms.spiking_errors + pms.assists +
      pms.setting_errors + pms.kill_blocks + pms.block_touches + pms.serve_receives +
      pms.digs + pms.block_follows + pms.dives + pms.aces +
      pms.service_errors + pms.misc_errors
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
  ROUND((r.spiking_errors_total + r.setting_errors_total + r.service_errors_total + r.misc_errors_total)::numeric
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
  r.misc_errors_total
FROM raw r;

ALTER VIEW "public"."v_player_season_stats" OWNER TO "postgres";

GRANT SELECT ON "public"."v_player_season_stats" TO "anon";
GRANT SELECT ON "public"."v_player_season_stats" TO "authenticated";
GRANT SELECT ON "public"."v_player_season_stats" TO "service_role";

CREATE OR REPLACE VIEW "public"."v_player_alltime_leaderboard" AS
WITH agg AS (
  SELECT
    v.player_id,
    s.region_id,
    SUM(v.sets_played)::int              AS sets_played,
    SUM(v.matches_played)::int           AS matches_played,
    COUNT(DISTINCT v.season_id)::int     AS seasons_played,
    SUM(v.ape_kills_total)::int          AS ape_kills_total,
    SUM(v.ape_attempts_total)::int       AS ape_attempts_total,
    SUM(v.delay_kills_total)::int        AS delay_kills_total,
    SUM(v.quick_kills_total)::int        AS quick_kills_total,
    SUM(v.wipes_tools_total)::int        AS wipes_tools_total,
    SUM(v.kill_attempts_total)::int      AS kill_attempts_total,
    SUM(v.spiking_errors_total)::int     AS spiking_errors_total,
    SUM(v.assists_total)::int            AS assists_total,
    SUM(v.setting_errors_total)::int     AS setting_errors_total,
    SUM(v.kill_blocks_total)::int        AS kill_blocks_total,
    SUM(v.block_touches_total)::int      AS block_touches_total,
    SUM(v.serve_receives_total)::int     AS serve_receives_total,
    SUM(v.digs_total)::int               AS digs_total,
    SUM(v.block_follows_total)::int      AS block_follows_total,
    SUM(v.dives_total)::int              AS dives_total,
    SUM(v.aces_total)::int               AS aces_total,
    SUM(v.service_errors_total)::int     AS service_errors_total,
    SUM(v.misc_errors_total)::int        AS misc_errors_total
  FROM "public"."v_player_season_stats" v
  JOIN "public"."seasons" s ON s.id = v.season_id
  GROUP BY v.player_id, s.region_id
)
SELECT
  a.player_id,
  a.region_id,
  a.sets_played,
  a.matches_played,
  a.seasons_played,

  ROUND(a.ape_kills_total::numeric       / NULLIF(a.sets_played, 0), 2) AS ape_kills_per_set,
  ROUND(a.ape_attempts_total::numeric    / NULLIF(a.sets_played, 0), 2) AS ape_attempts_per_set,
  ROUND(a.delay_kills_total::numeric     / NULLIF(a.sets_played, 0), 2) AS delay_kills_per_set,
  ROUND(a.quick_kills_total::numeric     / NULLIF(a.sets_played, 0), 2) AS quick_kills_per_set,
  ROUND(a.wipes_tools_total::numeric     / NULLIF(a.sets_played, 0), 2) AS wipes_tools_per_set,
  ROUND((a.ape_kills_total + a.delay_kills_total + a.quick_kills_total + a.wipes_tools_total)::numeric
        / NULLIF(a.sets_played, 0), 2)                                   AS kills_per_set,
  ROUND(a.kill_attempts_total::numeric   / NULLIF(a.sets_played, 0), 2) AS kill_attempts_per_set,
  ROUND(a.spiking_errors_total::numeric  / NULLIF(a.sets_played, 0), 2) AS spiking_errors_per_set,

  ROUND(a.assists_total::numeric         / NULLIF(a.sets_played, 0), 2) AS assists_per_set,
  ROUND(a.setting_errors_total::numeric  / NULLIF(a.sets_played, 0), 2) AS setting_errors_per_set,

  ROUND(a.kill_blocks_total::numeric     / NULLIF(a.sets_played, 0), 2) AS kill_blocks_per_set,
  ROUND(a.block_touches_total::numeric   / NULLIF(a.sets_played, 0), 2) AS block_touches_per_set,
  ROUND((a.kill_blocks_total + a.block_touches_total)::numeric
        / NULLIF(a.sets_played, 0), 2)                                   AS blocks_per_set,

  ROUND(a.serve_receives_total::numeric  / NULLIF(a.sets_played, 0), 2) AS serve_receives_per_set,
  ROUND(a.digs_total::numeric            / NULLIF(a.sets_played, 0), 2) AS digs_per_set,
  ROUND(a.block_follows_total::numeric   / NULLIF(a.sets_played, 0), 2) AS block_follows_per_set,
  ROUND(a.dives_total::numeric           / NULLIF(a.sets_played, 0), 2) AS dives_per_set,
  ROUND((a.serve_receives_total + a.digs_total + a.block_follows_total + a.dives_total)::numeric
        / NULLIF(a.sets_played, 0), 2)                                   AS receives_per_set,

  ROUND(a.aces_total::numeric            / NULLIF(a.sets_played, 0), 2) AS aces_per_set,
  ROUND(a.service_errors_total::numeric  / NULLIF(a.sets_played, 0), 2) AS service_errors_per_set,
  (a.aces_total - a.service_errors_total)                                AS service_score,

  ROUND(a.misc_errors_total::numeric     / NULLIF(a.sets_played, 0), 2) AS misc_errors_per_set,
  ROUND((a.spiking_errors_total + a.setting_errors_total + a.service_errors_total + a.misc_errors_total)::numeric
        / NULLIF(a.sets_played, 0), 2)                                   AS errors_per_set,

  CASE
    WHEN a.kill_attempts_total = 0 THEN NULL
    ELSE ROUND(
      ((a.ape_kills_total + a.delay_kills_total + a.quick_kills_total + a.wipes_tools_total)
        - a.spiking_errors_total)::numeric
      / a.kill_attempts_total, 3)
  END AS hit_eff,
  CASE
    WHEN (a.kill_blocks_total + a.block_touches_total) = 0 THEN NULL
    ELSE ROUND(a.kill_blocks_total::numeric / (a.kill_blocks_total + a.block_touches_total), 3)
  END AS kb_pct,
  CASE
    WHEN (a.assists_total + a.setting_errors_total) = 0 THEN NULL
    ELSE ROUND(a.assists_total::numeric / (a.assists_total + a.setting_errors_total), 3)
  END AS set_eff,

  (a.ape_kills_total + a.delay_kills_total + a.quick_kills_total + a.wipes_tools_total
    + a.kill_blocks_total + a.aces_total)                                AS points_total,
  ROUND((a.ape_kills_total + a.delay_kills_total + a.quick_kills_total + a.wipes_tools_total
    + a.kill_blocks_total + a.aces_total)::numeric
        / NULLIF(a.sets_played, 0), 2)                                   AS points_per_set,
  a.kill_blocks_total,
  a.block_touches_total,
  a.assists_total,
  a.setting_errors_total,
  a.serve_receives_total,
  a.digs_total,
  a.block_follows_total,
  a.dives_total,
  a.ape_kills_total,
  a.delay_kills_total,
  a.quick_kills_total,
  a.wipes_tools_total,
  a.spiking_errors_total,
  a.aces_total,
  a.service_errors_total,
  (a.ape_kills_total + a.delay_kills_total + a.quick_kills_total + a.wipes_tools_total) AS kills_total,
  (a.kill_blocks_total + a.block_touches_total)                                          AS blocks_total,
  (a.serve_receives_total + a.digs_total + a.block_follows_total + a.dives_total)         AS receives_total,

  p.username,
  p.display_name,
  p.avatar_url,
  r.code AS region_code,

  t.team_id,
  t.team_name,
  t.team_slug,
  t.team_logo_url,
  t.team_logo_bg_removed,
  t.season_slug
FROM agg a
JOIN "public"."players" p ON p.id = a.player_id
JOIN "public"."regions" r ON r.id = a.region_id
LEFT JOIN LATERAL (
  SELECT
    tm.id              AS team_id,
    tm.name            AS team_name,
    tm.slug            AS team_slug,
    tm.logo_url        AS team_logo_url,
    tm.logo_bg_removed AS team_logo_bg_removed,
    se.slug            AS season_slug
  FROM "public"."player_team_seasons" pts
  JOIN "public"."teams" tm ON tm.id = pts.team_id
  JOIN "public"."seasons" se ON se.id = pts.season_id
  WHERE pts.player_id = a.player_id
    AND se.region_id = a.region_id
    AND tm.deleted_at IS NULL
  ORDER BY se.start_date DESC NULLS LAST, (pts.left_at IS NULL) DESC, pts.joined_at DESC
  LIMIT 1
) t ON true;

ALTER VIEW "public"."v_player_alltime_leaderboard" OWNER TO "postgres";

GRANT SELECT ON "public"."v_player_alltime_leaderboard" TO "anon";
GRANT SELECT ON "public"."v_player_alltime_leaderboard" TO "authenticated";
GRANT SELECT ON "public"."v_player_alltime_leaderboard" TO "service_role";
