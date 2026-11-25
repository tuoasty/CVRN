
CREATE OR REPLACE VIEW "public"."standings" AS
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
    "row_number"() OVER (PARTITION BY "s"."id" ORDER BY "count"(
        CASE
            WHEN ((("m"."home_team_id" = "t"."id") AND ("m"."home_sets_won" > "m"."away_sets_won")) OR (("m"."away_team_id" = "t"."id") AND ("m"."away_sets_won" > "m"."home_sets_won"))) THEN 1
            ELSE NULL::integer
        END) DESC, "count"(
        CASE
            WHEN ((("m"."home_team_id" = "t"."id") AND ("m"."home_sets_won" < "m"."away_sets_won")) OR (("m"."away_team_id" = "t"."id") AND ("m"."away_sets_won" < "m"."home_sets_won"))) THEN 1
            ELSE NULL::integer
        END) ASC, (
        CASE
            WHEN ("r"."standing_method" = 'points'::"text") THEN ("t"."starting_points" + COALESCE("sum"(
                CASE
                    WHEN ("m"."home_team_id" = "t"."id") THEN "m"."home_team_points"
                    WHEN ("m"."away_team_id" = "t"."id") THEN "m"."away_team_points"
                    ELSE NULL::numeric
                END), (0)::numeric) + COALESCE("sum"(
                CASE
                    WHEN ("m"."home_team_id" = "t"."id") THEN "m"."home_team_bonus"
                    WHEN ("m"."away_team_id" = "t"."id") THEN "m"."away_team_bonus"
                    ELSE NULL::numeric
                END), (0)::numeric))
            WHEN ("r"."standing_method" = 'points_without_bonus'::"text") THEN ("t"."starting_points" + COALESCE("sum"(
                CASE
                    WHEN ("m"."home_team_id" = "t"."id") THEN "m"."home_team_points"
                    WHEN ("m"."away_team_id" = "t"."id") THEN "m"."away_team_points"
                    ELSE NULL::numeric
                END), (0)::numeric))
            ELSE ("t"."starting_lvr" + COALESCE("sum"(
                CASE
                    WHEN ("m"."home_team_id" = "t"."id") THEN "m"."home_team_lvr"
                    WHEN ("m"."away_team_id" = "t"."id") THEN "m"."away_team_lvr"
                    ELSE NULL::numeric
                END), (0)::numeric))
        END) DESC, (
        CASE
            WHEN ("r"."standing_method" = 'points'::"text") THEN COALESCE("sum"(
                CASE
                    WHEN ("m"."home_team_id" = "t"."id") THEN "m"."home_sets_won"
                    WHEN ("m"."away_team_id" = "t"."id") THEN "m"."away_sets_won"
                    ELSE NULL::integer
                END), (0)::bigint)::numeric
            WHEN ("r"."standing_method" = 'points_without_bonus'::"text") THEN COALESCE("lrpd"."value", (0)::numeric)
            ELSE NULL::numeric
        END) DESC) AS "rank",
    ("t"."starting_points" + COALESCE("sum"(
        CASE
            WHEN ("m"."home_team_id" = "t"."id") THEN "m"."home_team_points"
            WHEN ("m"."away_team_id" = "t"."id") THEN "m"."away_team_points"
            ELSE NULL::numeric
        END), (0)::numeric)) AS "total_points",
    COALESCE("sum"(
        CASE
            WHEN ("m"."home_team_id" = "t"."id") THEN "m"."home_team_bonus"
            WHEN ("m"."away_team_id" = "t"."id") THEN "m"."away_team_bonus"
            ELSE NULL::numeric
        END), (0)::numeric) AS "total_bonus",
    "lrpd"."value" AS "last_round_point_diff",
    "t"."starting_points"
   FROM (((("public"."teams" "t"
     JOIN "public"."seasons" "s" ON (("t"."season_id" = "s"."id")))
     JOIN "public"."regions" "r" ON (("r"."id" = "s"."region_id")))
     LEFT JOIN "public"."matches" "m" ON (((("m"."home_team_id" = "t"."id") OR ("m"."away_team_id" = "t"."id")) AND ("m"."status" = 'completed'::"public"."match_status") AND ("m"."match_type" = 'season'::"public"."match_type"))))
     LEFT JOIN LATERAL (
        SELECT
            CASE
                WHEN ("lm"."home_team_id" = "t"."id") THEN "lm"."point_diff"
                ELSE (- "lm"."point_diff")
            END AS "value"
        FROM "public"."matches" "lm"
        WHERE ((("lm"."home_team_id" = "t"."id") OR ("lm"."away_team_id" = "t"."id"))
            AND ("lm"."status" = 'completed'::"public"."match_status")
            AND ("lm"."match_type" = 'season'::"public"."match_type"))
        ORDER BY "lm"."scheduled_at" DESC NULLS LAST
        LIMIT 1
     ) "lrpd" ON (true))
  WHERE (("t"."deleted_at" IS NULL) AND ("t"."is_bye" = false))
  GROUP BY "s"."id", "s"."region_id", "t"."id", "t"."name", "t"."slug", "t"."logo_url", "t"."logo_bg_removed", "t"."starting_lvr", "t"."starting_points", "r"."standing_method", "lrpd"."value";
