ALTER TABLE "public"."teams"
  ADD COLUMN "logo_bg_removed" boolean NOT NULL DEFAULT false;

DROP VIEW IF EXISTS "public"."standings";

CREATE VIEW "public"."standings" AS
 SELECT "s"."id" AS "season_id",
    "s"."region_id",
    "t"."id" AS "team_id",
    "t"."name" AS "team_name",
    "t"."slug" AS "team_slug",
    "t"."logo_url" AS "team_logo_url",
    "t"."logo_bg_removed" AS "team_logo_bg_removed",
    "t"."starting_lvr",
    "count"(
        CASE
            WHEN ((("m"."home_team_id" = "t"."id") AND ("m"."home_sets_won" > "m"."away_sets_won")) OR (("m"."away_team_id" = "t"."id") AND ("m"."away_sets_won" > "m"."home_sets_won"))) THEN 1
            ELSE NULL::integer
        END) AS "wins",
    "count"(
        CASE
            WHEN ((("m"."home_team_id" = "t"."id") AND ("m"."home_sets_won" < "m"."away_sets_won")) OR (("m"."away_team_id" = "t"."id") AND ("m"."away_sets_won" < "m"."home_sets_won"))) THEN 1
            ELSE NULL::integer
        END) AS "losses",
    COALESCE("sum"(
        CASE
            WHEN ("m"."home_team_id" = "t"."id") THEN "m"."home_sets_won"
            WHEN ("m"."away_team_id" = "t"."id") THEN "m"."away_sets_won"
            ELSE NULL::integer
        END), (0)::bigint) AS "sets_won",
    COALESCE("sum"(
        CASE
            WHEN ("m"."home_team_id" = "t"."id") THEN "m"."away_sets_won"
            WHEN ("m"."away_team_id" = "t"."id") THEN "m"."home_sets_won"
            ELSE NULL::integer
        END), (0)::bigint) AS "sets_lost",
    ("t"."starting_lvr" + COALESCE("sum"(
        CASE
            WHEN ("m"."home_team_id" = "t"."id") THEN "m"."home_team_lvr"
            WHEN ("m"."away_team_id" = "t"."id") THEN "m"."away_team_lvr"
            ELSE NULL::numeric
        END), (0)::numeric)) AS "total_lvr",
    "row_number"() OVER (PARTITION BY "s"."id" ORDER BY ("t"."starting_lvr" + COALESCE("sum"(
        CASE
            WHEN ("m"."home_team_id" = "t"."id") THEN "m"."home_team_lvr"
            WHEN ("m"."away_team_id" = "t"."id") THEN "m"."away_team_lvr"
            ELSE NULL::numeric
        END), (0)::numeric)) DESC, ("count"(
        CASE
            WHEN ((("m"."home_team_id" = "t"."id") AND ("m"."home_sets_won" > "m"."away_sets_won")) OR (("m"."away_team_id" = "t"."id") AND ("m"."away_sets_won" > "m"."home_sets_won"))) THEN 1
            ELSE NULL::integer
        END)) DESC) AS "rank"
   FROM (("public"."teams" "t"
     JOIN "public"."seasons" "s" ON (("t"."season_id" = "s"."id")))
     LEFT JOIN "public"."matches" "m" ON (((("m"."home_team_id" = "t"."id") OR ("m"."away_team_id" = "t"."id")) AND ("m"."status" = 'completed'::"public"."match_status") AND ("m"."match_type" = 'season'::"public"."match_type"))))
  WHERE (("t"."deleted_at" IS NULL) AND ("t"."is_bye" = false))
  GROUP BY "s"."id", "s"."region_id", "t"."id", "t"."name", "t"."slug", "t"."logo_url", "t"."logo_bg_removed", "t"."starting_lvr";
