
CREATE OR REPLACE VIEW "public"."v_matches_with_stats" AS
SELECT DISTINCT "match_id"
FROM "public"."player_match_stats";

ALTER VIEW "public"."v_matches_with_stats" OWNER TO "postgres";

GRANT SELECT ON "public"."v_matches_with_stats" TO "anon";
GRANT SELECT ON "public"."v_matches_with_stats" TO "authenticated";
GRANT SELECT ON "public"."v_matches_with_stats" TO "service_role";
