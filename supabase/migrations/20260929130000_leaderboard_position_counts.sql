CREATE OR REPLACE VIEW "public"."v_player_leaderboard" AS
 SELECT "v"."player_id",
    "v"."season_id",
    "v"."sets_played",
    "v"."matches_played",
    "v"."ape_kills_per_set",
    "v"."ape_attempts_per_set",
    "v"."delay_kills_per_set",
    "v"."quick_kills_per_set",
    "v"."wipes_tools_per_set",
    "v"."kills_per_set",
    "v"."kill_attempts_per_set",
    "v"."spiking_errors_per_set",
    "v"."assists_per_set",
    "v"."setting_errors_per_set",
    "v"."kill_blocks_per_set",
    "v"."block_touches_per_set",
    "v"."blocks_per_set",
    "v"."serve_receives_per_set",
    "v"."digs_per_set",
    "v"."block_follows_per_set",
    "v"."dives_per_set",
    "v"."receives_per_set",
    "v"."aces_per_set",
    "v"."service_errors_per_set",
    "v"."service_score",
    "v"."misc_errors_per_set",
    "v"."errors_per_set",
    "v"."hit_eff",
    "v"."kb_pct",
    "v"."set_eff",
    "v"."points_total",
    "v"."points_per_set",
    "v"."kill_blocks_total",
    "v"."block_touches_total",
    "v"."assists_total",
    "v"."setting_errors_total",
    "v"."serve_receives_total",
    "v"."digs_total",
    "v"."block_follows_total",
    "v"."dives_total",
    "v"."ape_kills_total",
    "v"."delay_kills_total",
    "v"."quick_kills_total",
    "v"."wipes_tools_total",
    "v"."spiking_errors_total",
    "v"."aces_total",
    "v"."service_errors_total",
    "v"."kills_total",
    "v"."blocks_total",
    "v"."receives_total",
    "v"."kill_attempts_total",
    "v"."ape_attempts_total",
    "v"."misc_errors_total",
    "v"."receive_errors_total",
    "v"."rec_eff",
    "v"."errors_total",
    "v"."jump_serve_aces_total",
    "v"."float_aces_total",
    "v"."jump_serve_aces_per_set",
    "v"."float_aces_per_set",
    "p"."username",
    "p"."display_name",
    "p"."avatar_url",
    "s"."name" AS "season_name",
    "s"."slug" AS "season_slug",
    "s"."start_date" AS "season_start_date",
    "r"."id" AS "region_id",
    "r"."code" AS "region_code",
    "t"."id" AS "team_id",
    "t"."name" AS "team_name",
    "t"."slug" AS "team_slug",
    "t"."logo_url" AS "team_logo_url",
    "t"."logo_bg_removed" AS "team_logo_bg_removed",
    "pos"."position_counts"
   FROM ((((("public"."v_player_season_stats" "v"
     JOIN "public"."players" "p" ON (("p"."id" = "v"."player_id")))
     JOIN "public"."seasons" "s" ON (("s"."id" = "v"."season_id")))
     JOIN "public"."regions" "r" ON (("r"."id" = "s"."region_id")))
     LEFT JOIN LATERAL ( SELECT "tm"."id",
            "tm"."name",
            "tm"."slug",
            "tm"."logo_url",
            "tm"."logo_bg_removed"
           FROM ("public"."player_team_seasons" "pts"
             JOIN "public"."teams" "tm" ON (("tm"."id" = "pts"."team_id")))
          WHERE (("pts"."player_id" = "v"."player_id") AND ("pts"."season_id" = "v"."season_id") AND ("tm"."deleted_at" IS NULL))
          ORDER BY ("pts"."left_at" IS NULL) DESC, "pts"."joined_at" DESC
         LIMIT 1) "t" ON (true))
     LEFT JOIN LATERAL ( SELECT "jsonb_object_agg"("pc"."position", "pc"."sets") AS "position_counts"
           FROM ( SELECT "pms"."position",
                    "count"(*) AS "sets"
                   FROM ("public"."player_match_stats" "pms"
                     JOIN "public"."matches" "m" ON (("m"."id" = "pms"."match_id")))
                  WHERE (("pms"."player_id" = "v"."player_id") AND ("m"."season_id" = "v"."season_id") AND ("m"."status" = 'completed') AND ("pms"."position" IS NOT NULL))
                  GROUP BY "pms"."position") "pc") "pos" ON (true));

ALTER VIEW "public"."v_player_leaderboard" OWNER TO "postgres";
