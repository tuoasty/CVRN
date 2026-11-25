
CREATE VIEW "public"."v_player_leaderboard" AS
SELECT
  v.*,
  p.username,
  p.display_name,
  p.avatar_url,
  s.name  AS season_name,
  s.slug  AS season_slug,
  r.id    AS region_id,
  r.code  AS region_code,
  t.id       AS team_id,
  t.name     AS team_name,
  t.slug     AS team_slug,
  t.logo_url AS team_logo_url
FROM "public"."v_player_season_stats" v
JOIN "public"."players" p ON p.id = v.player_id
JOIN "public"."seasons" s ON s.id = v.season_id
JOIN "public"."regions" r ON r.id = s.region_id

LEFT JOIN LATERAL (
  SELECT tm.id, tm.name, tm.slug, tm.logo_url
  FROM "public"."player_team_seasons" pts
  JOIN "public"."teams" tm ON tm.id = pts.team_id
  WHERE pts.player_id = v.player_id
    AND pts.season_id = v.season_id
    AND tm.deleted_at IS NULL
  ORDER BY (pts.left_at IS NULL) DESC, pts.joined_at DESC
  LIMIT 1
) t ON true;

GRANT SELECT ON "public"."v_player_leaderboard" TO "anon";
GRANT SELECT ON "public"."v_player_leaderboard" TO "authenticated";
GRANT SELECT ON "public"."v_player_leaderboard" TO "service_role";
