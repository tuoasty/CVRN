CREATE OR REPLACE FUNCTION "public"."get_player_position_counts_ranged"(
  "p_season_id" "uuid" DEFAULT NULL,
  "p_from" timestamp with time zone DEFAULT NULL,
  "p_to" timestamp with time zone DEFAULT NULL
)
RETURNS TABLE (
  "player_id" "uuid",
  "position_counts" "jsonb"
)
LANGUAGE "sql"
STABLE
AS $$
  SELECT
    pc.player_id,
    jsonb_object_agg(pc.position, pc.sets) AS position_counts
  FROM (
    SELECT pms.player_id, pms.position, count(*) AS sets
    FROM "public"."player_match_stats" pms
    JOIN "public"."matches" m ON m.id = pms.match_id
    WHERE m.status = 'completed'
      AND (p_season_id IS NULL OR m.season_id = p_season_id)
      AND (p_from IS NULL OR m.scheduled_at >= p_from)
      AND (p_to   IS NULL OR m.scheduled_at <  p_to)
      AND pms.position IS NOT NULL
    GROUP BY pms.player_id, pms.position
  ) pc
  GROUP BY pc.player_id;
$$;

GRANT ALL ON FUNCTION "public"."get_player_position_counts_ranged"("uuid", timestamp with time zone, timestamp with time zone) TO "anon";
GRANT ALL ON FUNCTION "public"."get_player_position_counts_ranged"("uuid", timestamp with time zone, timestamp with time zone) TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_player_position_counts_ranged"("uuid", timestamp with time zone, timestamp with time zone) TO "service_role";
