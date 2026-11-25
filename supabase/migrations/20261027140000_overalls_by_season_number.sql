ALTER TABLE "public"."overall_scalings" ADD COLUMN "season_number" integer;

UPDATE "public"."overall_scalings" os
SET "season_number" = s.season_number
FROM "public"."seasons" s
WHERE s.id = os.season_id;

DELETE FROM "public"."overall_scalings" os
USING "public"."overall_scalings" newer
WHERE newer.season_number = os.season_number
  AND newer.position = os.position
  AND (newer.updated_at, newer.id) > (os.updated_at, os.id);

ALTER TABLE "public"."overall_scalings" DROP CONSTRAINT "overall_scalings_season_position_key";
ALTER TABLE "public"."overall_scalings" DROP CONSTRAINT "overall_scalings_season_id_fkey";
ALTER TABLE "public"."overall_scalings" DROP COLUMN "season_id";
ALTER TABLE "public"."overall_scalings" ALTER COLUMN "season_number" SET NOT NULL;
ALTER TABLE "public"."overall_scalings" ALTER COLUMN "floor" SET DEFAULT 60;
ALTER TABLE "public"."overall_scalings"
    ADD CONSTRAINT "overall_scalings_season_number_position_key" UNIQUE ("season_number", "position");
ALTER TABLE "public"."overall_scalings"
    ADD CONSTRAINT "overall_scalings_season_number_check" CHECK ("season_number" >= 1);

ALTER TABLE "public"."player_overalls" ADD COLUMN "season_number" integer;

UPDATE "public"."player_overalls" po
SET "season_number" = s.season_number
FROM "public"."seasons" s
WHERE s.id = po.season_id;

DELETE FROM "public"."player_overalls" po
USING "public"."player_overalls" newer
WHERE newer.season_number = po.season_number
  AND newer.player_id = po.player_id
  AND (newer.updated_at, newer.id) > (po.updated_at, po.id);

ALTER TABLE "public"."player_overalls" DROP CONSTRAINT "player_overalls_player_season_key";
ALTER TABLE "public"."player_overalls" DROP CONSTRAINT "player_overalls_season_id_fkey";
ALTER TABLE "public"."player_overalls" DROP COLUMN "season_id";
ALTER TABLE "public"."player_overalls" ALTER COLUMN "season_number" SET NOT NULL;
ALTER TABLE "public"."player_overalls"
    ADD CONSTRAINT "player_overalls_player_season_number_key" UNIQUE ("player_id", "season_number");
ALTER TABLE "public"."player_overalls"
    ADD CONSTRAINT "player_overalls_season_number_check" CHECK ("season_number" >= 1);
CREATE INDEX "player_overalls_season_number_idx" ON "public"."player_overalls" ("season_number");

DROP FUNCTION "public"."get_season_overall_inputs"(uuid);

CREATE FUNCTION "public"."get_overall_inputs"(
    "p_season_number" integer
)
RETURNS TABLE (
    "player_id" uuid,
    "roblox_user_id" text,
    "username" text,
    "display_name" text,
    "avatar_url" text,
    "region_code" text,
    "team_id" uuid,
    "team_name" text,
    "team_logo_url" text,
    "position" text,
    "sets_played" numeric,
    "scoring_rank" numeric,
    "spiking_rank" numeric,
    "setting_rank" numeric,
    "blocking_rank" numeric,
    "receiving_rank" numeric,
    "serving_rank" numeric
)
LANGUAGE "sql" STABLE
AS $$
    WITH season_stats AS (
        SELECT pms.player_id, m.season_id, pms.position, count(*) AS sets
        FROM "public"."player_match_stats" pms
        JOIN "public"."matches" m ON m.id = pms.match_id
        JOIN "public"."seasons" s ON s.id = m.season_id
        WHERE s.season_number = p_season_number AND m.status = 'completed'
        GROUP BY pms.player_id, m.season_id, pms.position
    ),
    season_players AS (
        SELECT DISTINCT player_id FROM season_stats
    ),
    stat_pos AS (
        SELECT DISTINCT ON (x.player_id) x.player_id, x.position
        FROM (
            SELECT player_id, position, sum(sets) AS sets
            FROM season_stats
            WHERE position IS NOT NULL
            GROUP BY player_id, position
        ) x
        ORDER BY x.player_id, x.sets DESC, array_position(ARRAY['OUT','OPP','MID','SET','LIB'], x.position)
    ),
    home_season AS (
        SELECT DISTINCT ON (x.player_id) x.player_id, x.season_id
        FROM (
            SELECT player_id, season_id, sum(sets) AS sets
            FROM season_stats
            GROUP BY player_id, season_id
        ) x
        ORDER BY x.player_id, x.sets DESC, x.season_id
    ),
    roster AS (
        SELECT DISTINCT ON (pts.player_id) pts.player_id, pts.team_id, pts.position
        FROM "public"."player_team_seasons" pts
        JOIN home_season hs ON hs.player_id = pts.player_id AND hs.season_id = pts.season_id
        ORDER BY pts.player_id, (pts.left_at IS NULL) DESC, pts.joined_at DESC
    )
    SELECT
        cr.player_id,
        cr.roblox_user_id::text,
        pl.username,
        pl.display_name,
        pl.avatar_url,
        r.code,
        t.id,
        t.name,
        t.logo_url,
        COALESCE(ro.position, sp.position),
        cr.sets_played,
        cr.scoring_rank, cr.spiking_rank, cr.setting_rank,
        cr.blocking_rank, cr.receiving_rank, cr.serving_rank
    FROM "public"."player_category_ranks"(p_season_number) cr
    JOIN season_players spl ON spl.player_id = cr.player_id
    JOIN "public"."players" pl ON pl.id = cr.player_id
    LEFT JOIN home_season hs ON hs.player_id = cr.player_id
    LEFT JOIN "public"."seasons" hss ON hss.id = hs.season_id
    LEFT JOIN "public"."regions" r ON r.id = hss.region_id
    LEFT JOIN roster ro ON ro.player_id = cr.player_id
    LEFT JOIN "public"."teams" t ON t.id = ro.team_id
    LEFT JOIN stat_pos sp ON sp.player_id = cr.player_id
$$;

ALTER FUNCTION "public"."get_overall_inputs"(integer) OWNER TO "postgres";
GRANT EXECUTE ON FUNCTION "public"."get_overall_inputs"(integer) TO "anon";
GRANT EXECUTE ON FUNCTION "public"."get_overall_inputs"(integer) TO "authenticated";
GRANT EXECUTE ON FUNCTION "public"."get_overall_inputs"(integer) TO "service_role";
