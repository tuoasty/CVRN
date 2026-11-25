ALTER TABLE "public"."player_match_stats"
  ADD COLUMN "position" "text",
  ADD COLUMN "jump_serve_aces" integer NOT NULL DEFAULT 0,
  ADD COLUMN "float_aces" integer NOT NULL DEFAULT 0;

ALTER TABLE "public"."player_match_stats"
  ALTER COLUMN "serve_receives" SET DEFAULT 0;

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
    SUM(pms.dives)::int                        AS dives_total,
    SUM(pms.aces + pms.jump_serve_aces + pms.float_aces)::int AS aces_total,
    SUM(pms.jump_serve_aces)::int             AS jump_serve_aces_total,
    SUM(pms.float_aces)::int                  AS float_aces_total,
    SUM(pms.service_errors)::int              AS service_errors_total,
    SUM(pms.misc_errors)::int                 AS misc_errors_total,
    SUM(pms.receive_errors)::int              AS receive_errors_total
  FROM "public"."player_match_stats" pms
  JOIN "public"."matches" m ON m.id = pms.match_id
  WHERE m.status = 'completed'
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

ALTER VIEW "public"."v_player_season_stats" OWNER TO "postgres";

GRANT SELECT ON "public"."v_player_season_stats" TO "anon";
GRANT SELECT ON "public"."v_player_season_stats" TO "authenticated";
GRANT SELECT ON "public"."v_player_season_stats" TO "service_role";

DROP VIEW IF EXISTS "public"."v_player_leaderboard";

CREATE VIEW "public"."v_player_leaderboard" AS
SELECT
  v.*,
  p.username,
  p.display_name,
  p.avatar_url,
  s.name  AS season_name,
  s.slug  AS season_slug,
  s.start_date AS season_start_date,
  r.id    AS region_id,
  r.code  AS region_code,
  t.id       AS team_id,
  t.name     AS team_name,
  t.slug     AS team_slug,
  t.logo_url AS team_logo_url,
  t.logo_bg_removed AS team_logo_bg_removed
FROM "public"."v_player_season_stats" v
JOIN "public"."players" p ON p.id = v.player_id
JOIN "public"."seasons" s ON s.id = v.season_id
JOIN "public"."regions" r ON r.id = s.region_id

LEFT JOIN LATERAL (
  SELECT tm.id, tm.name, tm.slug, tm.logo_url, tm.logo_bg_removed
  FROM "public"."player_team_seasons" pts
  JOIN "public"."teams" tm ON tm.id = pts.team_id
  WHERE pts.player_id = v.player_id
    AND pts.season_id = v.season_id
    AND tm.deleted_at IS NULL
  ORDER BY (pts.left_at IS NULL) DESC, pts.joined_at DESC
  LIMIT 1
) t ON true;

ALTER VIEW "public"."v_player_leaderboard" OWNER TO "postgres";

GRANT SELECT ON "public"."v_player_leaderboard" TO "anon";
GRANT SELECT ON "public"."v_player_leaderboard" TO "authenticated";
GRANT SELECT ON "public"."v_player_leaderboard" TO "service_role";

CREATE OR REPLACE VIEW "public"."v_player_match_stat_sets" AS
WITH derived AS (
  SELECT
    pms.*,
    (pms.ape_kills + pms.delay_kills + pms.quick_kills + pms.wipes_tools)            AS total_kills,
    pms.kill_attempts                                                                AS total_attempts,
    (pms.spiking_errors + pms.setting_errors + pms.service_errors + pms.misc_errors) AS total_errors,
    (pms.kill_blocks + pms.block_touches)                                            AS total_blocks,
    (pms.serve_receives + pms.digs + pms.block_follows + pms.dives)                  AS total_receives,
    (pms.aces + pms.jump_serve_aces + pms.float_aces)                                AS total_aces
  FROM "public"."player_match_stats" pms
)
SELECT
  d.match_id,
  d.player_id,
  d.team_id,
  d.set_number,

  p.username,
  p.display_name,
  p.avatar_url,
  t.name AS team_name,

  d.ape_kills,
  d.ape_attempts,
  d.delay_kills,
  d.quick_kills,
  d.wipes_tools,
  d.kill_attempts,
  d.spiking_errors,
  d.assists,
  d.setting_errors,
  d.kill_blocks,
  d.block_touches,
  d.serve_receives,
  d.digs,
  d.block_follows,
  d.dives,
  d.aces,
  d.service_errors,
  d.misc_errors,

  d.total_kills,
  d.total_attempts,
  d.total_errors,
  d.total_blocks,
  d.total_receives,

  CASE WHEN d.total_attempts = 0 THEN NULL
       ELSE (d.total_kills - d.spiking_errors)::numeric / d.total_attempts END AS hit_eff,
  CASE WHEN (d.assists + d.setting_errors) = 0 THEN NULL
       ELSE d.assists::numeric / (d.assists + d.setting_errors) END AS set_eff,
  CASE WHEN d.total_blocks = 0 THEN NULL
       ELSE d.kill_blocks::numeric / d.total_blocks END AS kb_pct,
  (d.total_aces - d.service_errors)                                         AS service_score,
  ( d.total_kills + d.assists + d.total_blocks + d.total_receives
  + d.total_aces - d.total_errors )                                         AS contributions,
  ( d.total_kills + d.kill_blocks + d.total_aces )                          AS points,

  d.receive_errors,
  d.jump_serve_aces,
  d.float_aces,
  d.total_aces,
  d.position
FROM derived d
JOIN "public"."players" p ON p.id = d.player_id
JOIN "public"."teams"   t ON t.id = d.team_id;

ALTER VIEW "public"."v_player_match_stat_sets" OWNER TO "postgres";

GRANT SELECT ON "public"."v_player_match_stat_sets" TO "anon";
GRANT SELECT ON "public"."v_player_match_stat_sets" TO "authenticated";
GRANT SELECT ON "public"."v_player_match_stat_sets" TO "service_role";

CREATE OR REPLACE VIEW "public"."v_player_match_stat_totals" AS
WITH sums AS (
  SELECT
    pms.match_id,
    pms.player_id,
    pms.team_id,
    SUM(pms.ape_kills)      AS ape_kills,
    SUM(pms.ape_attempts)   AS ape_attempts,
    SUM(pms.delay_kills)    AS delay_kills,
    SUM(pms.quick_kills)    AS quick_kills,
    SUM(pms.wipes_tools)    AS wipes_tools,
    SUM(pms.kill_attempts)  AS kill_attempts,
    SUM(pms.spiking_errors) AS spiking_errors,
    SUM(pms.assists)        AS assists,
    SUM(pms.setting_errors) AS setting_errors,
    SUM(pms.kill_blocks)    AS kill_blocks,
    SUM(pms.block_touches)  AS block_touches,
    SUM(pms.serve_receives) AS serve_receives,
    SUM(pms.digs)           AS digs,
    SUM(pms.block_follows)  AS block_follows,
    SUM(pms.dives)          AS dives,
    SUM(pms.aces)           AS aces,
    SUM(pms.service_errors) AS service_errors,
    SUM(pms.misc_errors)    AS misc_errors,
    SUM(pms.receive_errors) AS receive_errors,
    SUM(pms.jump_serve_aces) AS jump_serve_aces,
    SUM(pms.float_aces)      AS float_aces,

    COUNT(*) FILTER (WHERE (
      pms.ape_kills + pms.ape_attempts + pms.delay_kills + pms.quick_kills +
      pms.wipes_tools + pms.kill_attempts + pms.spiking_errors + pms.assists +
      pms.setting_errors + pms.kill_blocks + pms.block_touches + pms.serve_receives +
      pms.digs + pms.block_follows + pms.dives + pms.aces +
      pms.jump_serve_aces + pms.float_aces +
      pms.service_errors + pms.misc_errors
    ) > 0)::int             AS sets_played
  FROM "public"."player_match_stats" pms
  GROUP BY pms.match_id, pms.player_id, pms.team_id
),
derived AS (
  SELECT
    s.*,
    (s.ape_kills + s.delay_kills + s.quick_kills + s.wipes_tools)            AS total_kills,
    s.kill_attempts                                                          AS total_attempts,
    (s.spiking_errors + s.setting_errors + s.service_errors + s.misc_errors) AS total_errors,
    (s.kill_blocks + s.block_touches)                                        AS total_blocks,
    (s.serve_receives + s.digs + s.block_follows + s.dives)                  AS total_receives,
    (s.aces + s.jump_serve_aces + s.float_aces)                              AS total_aces
  FROM sums s
)
SELECT
  d.match_id,
  d.player_id,
  d.team_id,

  p.username,
  p.display_name,
  p.avatar_url,
  t.name AS team_name,

  d.ape_kills,
  d.ape_attempts,
  d.delay_kills,
  d.quick_kills,
  d.wipes_tools,
  d.kill_attempts,
  d.spiking_errors,
  d.assists,
  d.setting_errors,
  d.kill_blocks,
  d.block_touches,
  d.serve_receives,
  d.digs,
  d.block_follows,
  d.dives,
  d.aces,
  d.service_errors,
  d.misc_errors,
  d.sets_played,

  d.total_kills,
  d.total_attempts,
  d.total_errors,
  d.total_blocks,
  d.total_receives,

  CASE WHEN d.total_attempts = 0 THEN NULL
       ELSE (d.total_kills - d.spiking_errors)::numeric / d.total_attempts END AS hit_eff,
  CASE WHEN (d.assists + d.setting_errors) = 0 THEN NULL
       ELSE d.assists::numeric / (d.assists + d.setting_errors) END AS set_eff,
  CASE WHEN d.total_blocks = 0 THEN NULL
       ELSE d.kill_blocks::numeric / d.total_blocks END AS kb_pct,
  (d.total_aces - d.service_errors)                                         AS service_score,
  ( d.total_kills + d.assists + d.total_blocks + d.total_receives
  + d.total_aces - d.total_errors )                                         AS contributions,
  ( d.total_kills + d.kill_blocks + d.total_aces )                          AS points,

  d.receive_errors,
  d.jump_serve_aces,
  d.float_aces,
  d.total_aces
FROM derived d
JOIN "public"."players" p ON p.id = d.player_id
JOIN "public"."teams"   t ON t.id = d.team_id;

ALTER VIEW "public"."v_player_match_stat_totals" OWNER TO "postgres";

GRANT SELECT ON "public"."v_player_match_stat_totals" TO "anon";
GRANT SELECT ON "public"."v_player_match_stat_totals" TO "authenticated";
GRANT SELECT ON "public"."v_player_match_stat_totals" TO "service_role";
