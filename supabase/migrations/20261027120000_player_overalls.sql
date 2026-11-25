CREATE OR REPLACE FUNCTION "public"."player_category_ranks"(
    "p_season_number" integer DEFAULT NULL
)
RETURNS TABLE (
    "player_id" uuid,
    "roblox_user_id" bigint,
    "sets_played" numeric,
    "points_per_set" numeric,
    "kills_per_set" numeric,
    "assists_per_set" numeric,
    "blocks_per_set" numeric,
    "receives_per_set" numeric,
    "digs_per_set" numeric,
    "aces_per_set" numeric,
    "net_serve_per_set" numeric,
    "scoring_rank" numeric,
    "spiking_rank" numeric,
    "setting_rank" numeric,
    "blocking_rank" numeric,
    "receiving_rank" numeric,
    "serving_rank" numeric
)
LANGUAGE "sql" STABLE
AS $$
    WITH per_player AS (
        SELECT
            pms.player_id,
            pl.roblox_user_id,
            SUM(CASE WHEN pms.set_number = 5 THEN 0.5 ELSE 1 END)::numeric AS sets_played,
            SUM(pms.ape_kills)::int AS ape_kills, SUM(pms.delay_kills)::int AS delay_kills,
            SUM(pms.quick_kills)::int AS quick_kills, SUM(pms.wipes_tools)::int AS wipes_tools,
            SUM(pms.kill_attempts)::int AS kill_attempts, SUM(pms.spiking_errors)::int AS spiking_errors,
            SUM(pms.assists)::int AS assists, SUM(pms.setting_errors)::int AS setting_errors,
            SUM(pms.kill_blocks)::int AS kill_blocks, SUM(pms.block_touches)::int AS block_touches,
            SUM(pms.serve_receives + pms.digs + pms.block_follows + pms.dives)::int AS receives,
            SUM(pms.digs)::int AS digs,
            SUM(pms.jump_serve_aces + pms.aces)::int AS jump_serve_aces, SUM(pms.float_aces)::int AS float_aces,
            SUM(pms.service_errors)::int AS service_errors
        FROM "public"."player_match_stats" pms
        JOIN "public"."players" pl ON pl.id = pms.player_id
        JOIN "public"."matches" m ON m.id = pms.match_id
        JOIN "public"."seasons" s ON s.id = m.season_id
        WHERE m.status = 'completed'
          AND (p_season_number IS NULL OR s.season_number = p_season_number)
          AND (
            pms.ape_kills + pms.ape_attempts + pms.delay_kills + pms.quick_kills +
            pms.wipes_tools + pms.kill_attempts + pms.spiking_errors + pms.assists +
            pms.setting_errors + pms.kill_blocks + pms.block_touches + pms.serve_receives +
            pms.digs + pms.block_follows + pms.dives + pms.aces +
            pms.jump_serve_aces + pms.float_aces + pms.service_errors + pms.misc_errors + pms.receive_errors
          ) > 0
        GROUP BY pms.player_id, pl.roblox_user_id
    ),
    primary_pos AS (
        SELECT DISTINCT ON (pc.player_id) pc.player_id, pc.position
        FROM (
            SELECT pms.player_id, pms.position, count(*) AS sets
            FROM "public"."player_match_stats" pms
            JOIN "public"."matches" m ON m.id = pms.match_id
            WHERE m.status = 'completed' AND pms.position IS NOT NULL
            GROUP BY pms.player_id, pms.position
        ) pc
        ORDER BY pc.player_id, pc.sets DESC, array_position(ARRAY['OUT','OPP','MID','SET','LIB'], pc.position)
    ),
    qualified AS (
        SELECT
            *,
            (ape_kills + delay_kills + quick_kills + wipes_tools) AS kills,
            (kill_blocks + block_touches) AS blocks,
            (jump_serve_aces + float_aces) AS aces
        FROM per_player
    ),
    rated AS (
        SELECT *, (kills + kill_blocks + aces) AS points, (aces - service_errors) AS net_serve
        FROM qualified
    ),
    league AS (
        SELECT
            SUM(points)::numeric / SUM(sets_played) AS points_mu,
            SUM(kills)::numeric / SUM(sets_played) AS kills_mu,
            SUM(assists)::numeric / SUM(sets_played) AS assists_mu,
            SUM(blocks)::numeric / SUM(sets_played) AS blocks_mu,
            SUM(kill_blocks)::numeric / SUM(sets_played) AS kill_blocks_mu,
            SUM(receives)::numeric / SUM(sets_played) AS receives_mu,
            SUM(digs)::numeric / SUM(sets_played) AS digs_mu,
            SUM(aces)::numeric / SUM(sets_played) AS aces_mu,
            SUM(net_serve)::numeric / SUM(sets_played) AS net_serve_mu
        FROM rated
    ),
    shrinkage AS (
        SELECT
            1.2::numeric AS points_k,
            1.2::numeric AS kills_k,
            0.1::numeric AS assists_k,
            0.6::numeric AS blocks_k,
            2.85::numeric AS kill_blocks_k,
            0.9::numeric AS receives_k,
            2.24::numeric AS digs_k,
            3.6::numeric AS aces_k,
            19.46::numeric AS net_serve_k,
            10.299::numeric AS set_assists_mu,
            1.94::numeric AS set_assists_k
    ),
    gated AS (
        SELECT
            r.player_id, r.roblox_user_id, r.sets_played,
            ROUND((r.points + sh.points_k * lg.points_mu) / (r.sets_played + sh.points_k), 3) AS points_per_set,
            ROUND((r.kills + sh.kills_k * lg.kills_mu) / (r.sets_played + sh.kills_k), 3) AS kills_per_set,
            CASE WHEN r.sets_played >= 4 AND r.kill_attempts >= 10
                THEN ROUND((r.kills - r.spiking_errors)::numeric / r.kill_attempts, 3) END AS hit_pct,
            ROUND(CASE WHEN pp.position = 'SET' AND (p_season_number IS NULL OR p_season_number >= 2)
                THEN (r.assists + sh.set_assists_k * sh.set_assists_mu) / (r.sets_played + sh.set_assists_k)
                ELSE (r.assists + sh.assists_k * lg.assists_mu) / (r.sets_played + sh.assists_k)
            END, 3) AS assists_per_set,
            CASE WHEN r.sets_played >= 4 AND (r.assists + r.setting_errors) >= 10
                THEN ROUND(r.assists::numeric / (r.assists + r.setting_errors), 3) END AS set_pct,
            ROUND((r.blocks + sh.blocks_k * lg.blocks_mu) / (r.sets_played + sh.blocks_k), 3) AS blocks_per_set,
            ROUND((r.kill_blocks + sh.kill_blocks_k * lg.kill_blocks_mu) / (r.sets_played + sh.kill_blocks_k), 3) AS kill_blocks_per_set,
            ROUND((r.receives + sh.receives_k * lg.receives_mu) / (r.sets_played + sh.receives_k), 3) AS receives_per_set,
            ROUND((r.digs + sh.digs_k * lg.digs_mu) / (r.sets_played + sh.digs_k), 3) AS digs_per_set,
            ROUND((r.aces + sh.aces_k * lg.aces_mu) / (r.sets_played + sh.aces_k), 3) AS aces_per_set,
            ROUND((r.net_serve + sh.net_serve_k * lg.net_serve_mu) / (r.sets_played + sh.net_serve_k), 3) AS net_serve_per_set
        FROM rated r
        LEFT JOIN primary_pos pp ON pp.player_id = r.player_id
        CROSS JOIN league lg
        CROSS JOIN shrinkage sh
    ),
    ranked AS (
        SELECT
            player_id, roblox_user_id, sets_played,
            points_per_set, kills_per_set, assists_per_set, blocks_per_set,
            receives_per_set, digs_per_set, aces_per_set, net_serve_per_set,
            PERCENT_RANK() OVER (ORDER BY points_per_set) AS points_per_set_rank,
            PERCENT_RANK() OVER (ORDER BY kills_per_set) AS kills_per_set_rank,
            CASE WHEN hit_pct IS NULL THEN NULL ELSE
                PERCENT_RANK() OVER (PARTITION BY (hit_pct IS NOT NULL) ORDER BY hit_pct) END AS hit_pct_rank,
            PERCENT_RANK() OVER (ORDER BY assists_per_set) AS assists_per_set_rank,
            CASE WHEN set_pct IS NULL THEN NULL ELSE
                PERCENT_RANK() OVER (PARTITION BY (set_pct IS NOT NULL) ORDER BY set_pct) END AS set_pct_rank,
            PERCENT_RANK() OVER (ORDER BY blocks_per_set) AS blocks_per_set_rank,
            PERCENT_RANK() OVER (ORDER BY kill_blocks_per_set) AS kill_blocks_per_set_rank,
            PERCENT_RANK() OVER (ORDER BY receives_per_set) AS receives_per_set_rank,
            PERCENT_RANK() OVER (ORDER BY digs_per_set) AS digs_per_set_rank,
            PERCENT_RANK() OVER (ORDER BY aces_per_set) AS aces_per_set_rank,
            PERCENT_RANK() OVER (ORDER BY net_serve_per_set) AS net_serve_per_set_rank
        FROM gated
    )
    SELECT
        player_id, roblox_user_id, sets_played,
        points_per_set, kills_per_set, assists_per_set, blocks_per_set,
        receives_per_set, digs_per_set, aces_per_set, net_serve_per_set,
        points_per_set_rank::numeric AS scoring_rank,
        (PERCENT_RANK() OVER (ORDER BY (kills_per_set_rank + COALESCE(hit_pct_rank, 0)) / 2))::numeric AS spiking_rank,
        (PERCENT_RANK() OVER (ORDER BY (assists_per_set_rank + COALESCE(set_pct_rank, 0)) / 2))::numeric AS setting_rank,
        (PERCENT_RANK() OVER (ORDER BY (blocks_per_set_rank + 2 * kill_blocks_per_set_rank) / 3))::numeric AS blocking_rank,
        (PERCENT_RANK() OVER (ORDER BY (receives_per_set_rank + digs_per_set_rank) / 2))::numeric AS receiving_rank,
        (PERCENT_RANK() OVER (ORDER BY (aces_per_set_rank + net_serve_per_set_rank) / 2))::numeric AS serving_rank
    FROM ranked
$$;

ALTER FUNCTION "public"."player_category_ranks"(integer) OWNER TO "postgres";

GRANT EXECUTE ON FUNCTION "public"."player_category_ranks"(integer) TO "anon";
GRANT EXECUTE ON FUNCTION "public"."player_category_ranks"(integer) TO "authenticated";
GRANT EXECUTE ON FUNCTION "public"."player_category_ranks"(integer) TO "service_role";

CREATE OR REPLACE FUNCTION "public"."get_player_stat_ranks"(
    "p_roblox_user_id" text,
    "p_season_number" integer DEFAULT NULL
)
RETURNS TABLE (
    "points_per_set" numeric,
    "kills_per_set" numeric,
    "assists_per_set" numeric,
    "blocks_per_set" numeric,
    "receives_per_set" numeric,
    "digs_per_set" numeric,
    "aces_per_set" numeric,
    "net_serve_per_set" numeric,
    "scoring_rank" numeric,
    "spiking_rank" numeric,
    "setting_rank" numeric,
    "blocking_rank" numeric,
    "receiving_rank" numeric,
    "serving_rank" numeric
)
LANGUAGE "sql" STABLE
AS $$
    SELECT
        c.points_per_set, c.kills_per_set, c.assists_per_set, c.blocks_per_set,
        c.receives_per_set, c.digs_per_set, c.aces_per_set, c.net_serve_per_set,
        c.scoring_rank, c.spiking_rank, c.setting_rank, c.blocking_rank, c.receiving_rank, c.serving_rank
    FROM (SELECT p_roblox_user_id::bigint AS roblox_user_id) target
    LEFT JOIN "public"."player_category_ranks"(p_season_number) c ON c.roblox_user_id = target.roblox_user_id
$$;

ALTER FUNCTION "public"."get_player_stat_ranks"(text, integer) OWNER TO "postgres";

GRANT EXECUTE ON FUNCTION "public"."get_player_stat_ranks"(text, integer) TO "anon";
GRANT EXECUTE ON FUNCTION "public"."get_player_stat_ranks"(text, integer) TO "authenticated";
GRANT EXECUTE ON FUNCTION "public"."get_player_stat_ranks"(text, integer) TO "service_role";

CREATE OR REPLACE FUNCTION "public"."get_season_overall_inputs"(
    "p_season_id" uuid
)
RETURNS TABLE (
    "player_id" uuid,
    "roblox_user_id" text,
    "username" text,
    "display_name" text,
    "avatar_url" text,
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
        SELECT pms.player_id, pms.position, count(*) AS sets
        FROM "public"."player_match_stats" pms
        JOIN "public"."matches" m ON m.id = pms.match_id
        WHERE m.season_id = p_season_id AND m.status = 'completed'
        GROUP BY pms.player_id, pms.position
    ),
    season_players AS (
        SELECT DISTINCT player_id FROM season_stats
    ),
    stat_pos AS (
        SELECT DISTINCT ON (ss.player_id) ss.player_id, ss.position
        FROM season_stats ss
        WHERE ss.position IS NOT NULL
        ORDER BY ss.player_id, ss.sets DESC, array_position(ARRAY['OUT','OPP','MID','SET','LIB'], ss.position)
    ),
    roster AS (
        SELECT DISTINCT ON (pts.player_id) pts.player_id, pts.team_id, pts.position
        FROM "public"."player_team_seasons" pts
        WHERE pts.season_id = p_season_id
        ORDER BY pts.player_id, (pts.left_at IS NULL) DESC, pts.joined_at DESC
    )
    SELECT
        cr.player_id,
        cr.roblox_user_id::text,
        pl.username,
        pl.display_name,
        pl.avatar_url,
        t.id,
        t.name,
        t.logo_url,
        COALESCE(ro.position, sp.position),
        cr.sets_played,
        cr.scoring_rank, cr.spiking_rank, cr.setting_rank,
        cr.blocking_rank, cr.receiving_rank, cr.serving_rank
    FROM "public"."player_category_ranks"(
        (SELECT s.season_number FROM "public"."seasons" s WHERE s.id = p_season_id)
    ) cr
    JOIN season_players spl ON spl.player_id = cr.player_id
    JOIN "public"."players" pl ON pl.id = cr.player_id
    LEFT JOIN roster ro ON ro.player_id = cr.player_id
    LEFT JOIN "public"."teams" t ON t.id = ro.team_id
    LEFT JOIN stat_pos sp ON sp.player_id = cr.player_id
$$;

ALTER FUNCTION "public"."get_season_overall_inputs"(uuid) OWNER TO "postgres";

GRANT EXECUTE ON FUNCTION "public"."get_season_overall_inputs"(uuid) TO "anon";
GRANT EXECUTE ON FUNCTION "public"."get_season_overall_inputs"(uuid) TO "authenticated";
GRANT EXECUTE ON FUNCTION "public"."get_season_overall_inputs"(uuid) TO "service_role";

CREATE TABLE "public"."overall_scalings" (
    "id"          uuid        NOT NULL DEFAULT gen_random_uuid(),
    "season_id"   uuid        NOT NULL,
    "position"    text        NOT NULL,
    "w_scoring"   numeric     NOT NULL DEFAULT 1,
    "w_spiking"   numeric     NOT NULL DEFAULT 1,
    "w_setting"   numeric     NOT NULL DEFAULT 1,
    "w_blocking"  numeric     NOT NULL DEFAULT 1,
    "w_receiving" numeric     NOT NULL DEFAULT 1,
    "w_serving"   numeric     NOT NULL DEFAULT 1,
    "floor"       numeric     NOT NULL DEFAULT 45,
    "ceil"        numeric     NOT NULL DEFAULT 99,
    "curve"       numeric     NOT NULL DEFAULT 1,
    "created_at"  timestamptz NOT NULL DEFAULT now(),
    "updated_at"  timestamptz NOT NULL DEFAULT now(),
    CONSTRAINT "overall_scalings_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "overall_scalings_season_position_key" UNIQUE ("season_id", "position"),
    CONSTRAINT "overall_scalings_season_id_fkey" FOREIGN KEY ("season_id") REFERENCES "public"."seasons"("id") ON DELETE CASCADE,
    CONSTRAINT "overall_scalings_position_check" CHECK ("position" = ANY (ARRAY['OUT'::text, 'OPP'::text, 'MID'::text, 'SET'::text, 'LIB'::text])),
    CONSTRAINT "overall_scalings_weights_check" CHECK (
        "w_scoring" >= 0 AND "w_spiking" >= 0 AND "w_setting" >= 0 AND
        "w_blocking" >= 0 AND "w_receiving" >= 0 AND "w_serving" >= 0
    ),
    CONSTRAINT "overall_scalings_range_check" CHECK ("floor" >= 1 AND "ceil" <= 99 AND "floor" < "ceil"),
    CONSTRAINT "overall_scalings_curve_check" CHECK ("curve" > 0)
);

CREATE TABLE "public"."player_overalls" (
    "id"         uuid        NOT NULL DEFAULT gen_random_uuid(),
    "player_id"  uuid        NOT NULL,
    "season_id"  uuid        NOT NULL,
    "overall"    integer     NOT NULL,
    "updated_by" uuid        DEFAULT auth.uid(),
    "created_at" timestamptz NOT NULL DEFAULT now(),
    "updated_at" timestamptz NOT NULL DEFAULT now(),
    CONSTRAINT "player_overalls_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "player_overalls_player_season_key" UNIQUE ("player_id", "season_id"),
    CONSTRAINT "player_overalls_player_id_fkey" FOREIGN KEY ("player_id") REFERENCES "public"."players"("id") ON DELETE CASCADE,
    CONSTRAINT "player_overalls_season_id_fkey" FOREIGN KEY ("season_id") REFERENCES "public"."seasons"("id") ON DELETE CASCADE,
    CONSTRAINT "player_overalls_updated_by_fkey" FOREIGN KEY ("updated_by") REFERENCES "auth"."users"("id") ON DELETE SET NULL,
    CONSTRAINT "player_overalls_overall_check" CHECK ("overall" BETWEEN 1 AND 99)
);

CREATE INDEX "player_overalls_season_id_idx" ON "public"."player_overalls" ("season_id");

ALTER TABLE "public"."overall_scalings" ENABLE ROW LEVEL SECURITY;

CREATE POLICY "admins can read overall_scalings" ON "public"."overall_scalings"
    FOR SELECT TO "authenticated"
    USING ((EXISTS (SELECT 1 FROM "public"."user_roles"
        WHERE (("user_roles"."user_id" = (SELECT "auth"."uid"() AS "uid"))
            AND ("user_roles"."role" = ANY (ARRAY['admin'::"text", 'super_admin'::"text"]))))));

CREATE POLICY "admins can insert overall_scalings" ON "public"."overall_scalings"
    FOR INSERT TO "authenticated"
    WITH CHECK ((EXISTS (SELECT 1 FROM "public"."user_roles"
        WHERE (("user_roles"."user_id" = (SELECT "auth"."uid"() AS "uid"))
            AND ("user_roles"."role" = ANY (ARRAY['admin'::"text", 'super_admin'::"text"]))))));

CREATE POLICY "admins can update overall_scalings" ON "public"."overall_scalings"
    FOR UPDATE TO "authenticated"
    USING ((EXISTS (SELECT 1 FROM "public"."user_roles"
        WHERE (("user_roles"."user_id" = (SELECT "auth"."uid"() AS "uid"))
            AND ("user_roles"."role" = ANY (ARRAY['admin'::"text", 'super_admin'::"text"]))))));

CREATE POLICY "admins can delete overall_scalings" ON "public"."overall_scalings"
    FOR DELETE TO "authenticated"
    USING ((EXISTS (SELECT 1 FROM "public"."user_roles"
        WHERE (("user_roles"."user_id" = (SELECT "auth"."uid"() AS "uid"))
            AND ("user_roles"."role" = ANY (ARRAY['admin'::"text", 'super_admin'::"text"]))))));

ALTER TABLE "public"."player_overalls" ENABLE ROW LEVEL SECURITY;

CREATE POLICY "admins can read player_overalls" ON "public"."player_overalls"
    FOR SELECT TO "authenticated"
    USING ((EXISTS (SELECT 1 FROM "public"."user_roles"
        WHERE (("user_roles"."user_id" = (SELECT "auth"."uid"() AS "uid"))
            AND ("user_roles"."role" = ANY (ARRAY['admin'::"text", 'super_admin'::"text"]))))));

CREATE POLICY "admins can insert player_overalls" ON "public"."player_overalls"
    FOR INSERT TO "authenticated"
    WITH CHECK ((EXISTS (SELECT 1 FROM "public"."user_roles"
        WHERE (("user_roles"."user_id" = (SELECT "auth"."uid"() AS "uid"))
            AND ("user_roles"."role" = ANY (ARRAY['admin'::"text", 'super_admin'::"text"]))))));

CREATE POLICY "admins can update player_overalls" ON "public"."player_overalls"
    FOR UPDATE TO "authenticated"
    USING ((EXISTS (SELECT 1 FROM "public"."user_roles"
        WHERE (("user_roles"."user_id" = (SELECT "auth"."uid"() AS "uid"))
            AND ("user_roles"."role" = ANY (ARRAY['admin'::"text", 'super_admin'::"text"]))))));

CREATE POLICY "admins can delete player_overalls" ON "public"."player_overalls"
    FOR DELETE TO "authenticated"
    USING ((EXISTS (SELECT 1 FROM "public"."user_roles"
        WHERE (("user_roles"."user_id" = (SELECT "auth"."uid"() AS "uid"))
            AND ("user_roles"."role" = ANY (ARRAY['admin'::"text", 'super_admin'::"text"]))))));
