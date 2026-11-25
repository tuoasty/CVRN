
CREATE VIEW "public"."v_leaderboard_identity" AS
SELECT DISTINCT
  p.id,
  p.username,
  p.display_name,
  p.avatar_url
FROM "public"."players" p
WHERE EXISTS (
  SELECT 1
  FROM "public"."v_player_season_stats" v
  WHERE v.player_id = p.id
);

ALTER VIEW "public"."v_leaderboard_identity" OWNER TO "postgres";

GRANT SELECT ON "public"."v_leaderboard_identity" TO "anon";
GRANT SELECT ON "public"."v_leaderboard_identity" TO "authenticated";
GRANT SELECT ON "public"."v_leaderboard_identity" TO "service_role";
