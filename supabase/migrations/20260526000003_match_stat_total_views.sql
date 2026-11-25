
CREATE OR REPLACE VIEW "public"."v_player_match_stat_sets" AS
WITH derived AS (
  SELECT
    pms.*,
    (pms.ape_kills + pms.delay_kills + pms.quick_kills + pms.wipes_tools)            AS total_kills,
    (pms.ape_attempts + pms.kill_attempts)                                           AS total_attempts,
    (pms.spiking_errors + pms.setting_errors + pms.service_errors + pms.misc_errors) AS total_errors,
    (pms.kill_blocks + pms.block_touches)                                            AS total_blocks,
    (pms.serve_receives + pms.digs + pms.block_follows + pms.dives)                  AS total_receives
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
       ELSE (d.total_kills - d.total_errors)::numeric / d.total_attempts END AS hit_eff,
  CASE WHEN (d.assists + d.setting_errors) = 0 THEN NULL
       ELSE d.assists::numeric / (d.assists + d.setting_errors) END AS set_eff,
  CASE WHEN d.total_blocks = 0 THEN NULL
       ELSE d.kill_blocks::numeric / d.total_blocks END AS kb_pct,
  (d.aces - d.service_errors)                                                AS service_score,
  ( d.total_kills + d.assists + d.total_blocks + d.total_receives
  + d.aces - d.total_errors )                                                AS contributions
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
    COUNT(*)::int           AS sets_played
  FROM "public"."player_match_stats" pms
  GROUP BY pms.match_id, pms.player_id, pms.team_id
),
derived AS (
  SELECT
    s.*,
    (s.ape_kills + s.delay_kills + s.quick_kills + s.wipes_tools)            AS total_kills,
    (s.ape_attempts + s.kill_attempts)                                       AS total_attempts,
    (s.spiking_errors + s.setting_errors + s.service_errors + s.misc_errors) AS total_errors,
    (s.kill_blocks + s.block_touches)                                        AS total_blocks,
    (s.serve_receives + s.digs + s.block_follows + s.dives)                  AS total_receives
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
       ELSE (d.total_kills - d.total_errors)::numeric / d.total_attempts END AS hit_eff,
  CASE WHEN (d.assists + d.setting_errors) = 0 THEN NULL
       ELSE d.assists::numeric / (d.assists + d.setting_errors) END AS set_eff,
  CASE WHEN d.total_blocks = 0 THEN NULL
       ELSE d.kill_blocks::numeric / d.total_blocks END AS kb_pct,
  (d.aces - d.service_errors)                                                AS service_score,
  ( d.total_kills + d.assists + d.total_blocks + d.total_receives
  + d.aces - d.total_errors )                                                AS contributions
FROM derived d
JOIN "public"."players" p ON p.id = d.player_id
JOIN "public"."teams"   t ON t.id = d.team_id;

ALTER VIEW "public"."v_player_match_stat_totals" OWNER TO "postgres";

GRANT SELECT ON "public"."v_player_match_stat_totals" TO "anon";
GRANT SELECT ON "public"."v_player_match_stat_totals" TO "authenticated";
GRANT SELECT ON "public"."v_player_match_stat_totals" TO "service_role";
