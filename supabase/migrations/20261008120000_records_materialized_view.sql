CREATE MATERIALIZED VIEW "public"."mv_records" AS
WITH "base" AS (
    SELECT
        pms.match_id,
        pms.player_id,
        pms.team_id,
        pms.set_number,
        pms.position,
        m.season_id,
        s.region_id,
        COALESCE(m.scheduled_at, m.created_at) AS played_at,
        CASE WHEN pms.team_id = m.home_team_id THEN m.away_team_id ELSE m.home_team_id END AS opponent_team_id,
        (pms.ape_kills + pms.delay_kills + pms.quick_kills + pms.wipes_tools) AS kills,
        pms.ape_kills,
        pms.delay_kills,
        pms.quick_kills,
        pms.wipes_tools,
        pms.assists,
        (pms.kill_blocks + pms.block_touches) AS blocks,
        pms.kill_blocks,
        pms.block_touches,
        (pms.serve_receives + pms.digs + pms.block_follows + pms.dives) AS receives,
        pms.digs,
        pms.dives,
        (pms.aces + pms.jump_serve_aces + pms.float_aces) AS aces,
        (pms.spiking_errors + pms.setting_errors + pms.service_errors + pms.misc_errors + pms.receive_errors) AS errors
    FROM "public"."player_match_stats" pms
    JOIN "public"."matches" m ON m.id = pms.match_id
    JOIN "public"."seasons" s ON s.id = m.season_id
    WHERE m.status = 'completed'
      AND m.is_forfeit IS NOT TRUE
      AND (
        pms.ape_kills + pms.ape_attempts + pms.delay_kills + pms.quick_kills +
        pms.wipes_tools + pms.kill_attempts + pms.spiking_errors + pms.assists +
        pms.setting_errors + pms.kill_blocks + pms.block_touches + pms.serve_receives +
        pms.digs + pms.block_follows + pms.dives + pms.aces +
        pms.jump_serve_aces + pms.float_aces +
        pms.service_errors + pms.misc_errors + pms.receive_errors
      ) > 0
),
"player_match_positions" AS (
    SELECT x.player_id, x.match_id, jsonb_object_agg(x.position, x.sets) AS position_counts
    FROM (
        SELECT player_id, match_id, position, count(*)::int AS sets
        FROM "base"
        WHERE position IS NOT NULL
        GROUP BY player_id, match_id, position
    ) x
    GROUP BY x.player_id, x.match_id
),
"player_season_positions" AS (
    SELECT x.player_id, x.season_id, jsonb_object_agg(x.position, x.sets) AS position_counts
    FROM (
        SELECT player_id, season_id, position, count(*)::int AS sets
        FROM "base"
        WHERE position IS NOT NULL
        GROUP BY player_id, season_id, position
    ) x
    GROUP BY x.player_id, x.season_id
),
"player_season_team" AS (
    SELECT DISTINCT ON (player_id, season_id) player_id, season_id, team_id
    FROM "base"
    GROUP BY player_id, season_id, team_id
    ORDER BY player_id, season_id, count(*) DESC, max(played_at) DESC
),
"grains" AS (
    SELECT
        'set'::text AS grain,
        'player'::text AS subject,
        b.player_id,
        b.team_id,
        b.opponent_team_id,
        b.match_id,
        b.set_number,
        b.season_id,
        b.region_id,
        b.played_at,
        1 AS sets_played,
        1 AS matches_played,
        CASE WHEN b.position IS NOT NULL THEN jsonb_build_object(b.position, 1) END AS position_counts,
        (b.kills + b.kill_blocks + b.aces) AS points,
        b.kills, b.ape_kills, b.delay_kills, b.quick_kills, b.wipes_tools, b.assists,
        b.blocks, b.kill_blocks, b.block_touches, b.receives, b.digs, b.dives, b.aces, b.errors
    FROM "base" b

    UNION ALL

    SELECT
        'match', 'player',
        g.player_id, g.team_id, g.opponent_team_id, g.match_id, NULL::int,
        g.season_id, g.region_id, g.played_at,
        g.sets_played, 1,
        CASE WHEN g.all_positioned THEN pmp.position_counts END,
        g.points, g.kills, g.ape_kills, g.delay_kills, g.quick_kills, g.wipes_tools, g.assists,
        g.blocks, g.kill_blocks, g.block_touches, g.receives, g.digs, g.dives, g.aces, g.errors
    FROM (
        SELECT
            b.player_id, b.team_id, b.opponent_team_id, b.match_id,
            b.season_id, b.region_id, b.played_at,
            count(*)::int AS sets_played,
            bool_and(b.position IS NOT NULL) AS all_positioned,
            sum(b.kills + b.kill_blocks + b.aces)::int AS points,
            sum(b.kills)::int AS kills, sum(b.ape_kills)::int AS ape_kills, sum(b.delay_kills)::int AS delay_kills,
            sum(b.quick_kills)::int AS quick_kills, sum(b.wipes_tools)::int AS wipes_tools, sum(b.assists)::int AS assists,
            sum(b.blocks)::int AS blocks, sum(b.kill_blocks)::int AS kill_blocks, sum(b.block_touches)::int AS block_touches,
            sum(b.receives)::int AS receives, sum(b.digs)::int AS digs, sum(b.dives)::int AS dives,
            sum(b.aces)::int AS aces, sum(b.errors)::int AS errors
        FROM "base" b
        GROUP BY b.player_id, b.team_id, b.opponent_team_id, b.match_id, b.season_id, b.region_id, b.played_at
    ) g
    LEFT JOIN "player_match_positions" pmp ON pmp.player_id = g.player_id AND pmp.match_id = g.match_id

    UNION ALL

    SELECT
        'season', 'player',
        g.player_id, pst.team_id, NULL::uuid, NULL::uuid, NULL::int,
        g.season_id, g.region_id, g.played_at,
        g.sets_played, g.matches_played,
        CASE WHEN g.all_positioned THEN psp.position_counts END,
        g.points, g.kills, g.ape_kills, g.delay_kills, g.quick_kills, g.wipes_tools, g.assists,
        g.blocks, g.kill_blocks, g.block_touches, g.receives, g.digs, g.dives, g.aces, g.errors
    FROM (
        SELECT
            b.player_id, b.season_id, b.region_id,
            max(b.played_at) AS played_at,
            count(*)::int AS sets_played,
            count(DISTINCT b.match_id)::int AS matches_played,
            bool_and(b.position IS NOT NULL) AS all_positioned,
            sum(b.kills + b.kill_blocks + b.aces)::int AS points,
            sum(b.kills)::int AS kills, sum(b.ape_kills)::int AS ape_kills, sum(b.delay_kills)::int AS delay_kills,
            sum(b.quick_kills)::int AS quick_kills, sum(b.wipes_tools)::int AS wipes_tools, sum(b.assists)::int AS assists,
            sum(b.blocks)::int AS blocks, sum(b.kill_blocks)::int AS kill_blocks, sum(b.block_touches)::int AS block_touches,
            sum(b.receives)::int AS receives, sum(b.digs)::int AS digs, sum(b.dives)::int AS dives,
            sum(b.aces)::int AS aces, sum(b.errors)::int AS errors
        FROM "base" b
        GROUP BY b.player_id, b.season_id, b.region_id
    ) g
    JOIN "player_season_team" pst ON pst.player_id = g.player_id AND pst.season_id = g.season_id
    LEFT JOIN "player_season_positions" psp ON psp.player_id = g.player_id AND psp.season_id = g.season_id

    UNION ALL

    SELECT
        'set', 'team',
        NULL::uuid, b.team_id, b.opponent_team_id, b.match_id, b.set_number,
        b.season_id, b.region_id, b.played_at,
        1, 1,
        NULL::jsonb,
        sum(b.kills + b.kill_blocks + b.aces)::int,
        sum(b.kills)::int, sum(b.ape_kills)::int, sum(b.delay_kills)::int,
        sum(b.quick_kills)::int, sum(b.wipes_tools)::int, sum(b.assists)::int,
        sum(b.blocks)::int, sum(b.kill_blocks)::int, sum(b.block_touches)::int,
        sum(b.receives)::int, sum(b.digs)::int, sum(b.dives)::int,
        sum(b.aces)::int, sum(b.errors)::int
    FROM "base" b
    GROUP BY b.team_id, b.opponent_team_id, b.match_id, b.set_number, b.season_id, b.region_id, b.played_at

    UNION ALL

    SELECT
        'match', 'team',
        NULL::uuid, b.team_id, b.opponent_team_id, b.match_id, NULL::int,
        b.season_id, b.region_id, b.played_at,
        count(DISTINCT b.set_number)::int, 1,
        NULL::jsonb,
        sum(b.kills + b.kill_blocks + b.aces)::int,
        sum(b.kills)::int, sum(b.ape_kills)::int, sum(b.delay_kills)::int,
        sum(b.quick_kills)::int, sum(b.wipes_tools)::int, sum(b.assists)::int,
        sum(b.blocks)::int, sum(b.kill_blocks)::int, sum(b.block_touches)::int,
        sum(b.receives)::int, sum(b.digs)::int, sum(b.dives)::int,
        sum(b.aces)::int, sum(b.errors)::int
    FROM "base" b
    GROUP BY b.team_id, b.opponent_team_id, b.match_id, b.season_id, b.region_id, b.played_at

    UNION ALL

    SELECT
        'season', 'team',
        NULL::uuid, b.team_id, NULL::uuid, NULL::uuid, NULL::int,
        b.season_id, b.region_id, max(b.played_at),
        count(DISTINCT (b.match_id, b.set_number))::int, count(DISTINCT b.match_id)::int,
        NULL::jsonb,
        sum(b.kills + b.kill_blocks + b.aces)::int,
        sum(b.kills)::int, sum(b.ape_kills)::int, sum(b.delay_kills)::int,
        sum(b.quick_kills)::int, sum(b.wipes_tools)::int, sum(b.assists)::int,
        sum(b.blocks)::int, sum(b.kill_blocks)::int, sum(b.block_touches)::int,
        sum(b.receives)::int, sum(b.digs)::int, sum(b.dives)::int,
        sum(b.aces)::int, sum(b.errors)::int
    FROM "base" b
    GROUP BY b.team_id, b.season_id, b.region_id
),
"unpivoted" AS (
    SELECT
        sc.scope_key, sc.scope_kind, sc.scope_region_id, sc.scope_season_id,
        g.grain, g.subject, c.category, c.value,
        g.player_id, g.team_id, g.opponent_team_id, g.match_id, g.set_number,
        g.season_id, g.region_id, g.played_at, g.sets_played, g.matches_played,
        CASE WHEN g.grain = 'season' AND sc.scope_kind <> 'season' THEN NULL ELSE g.position_counts END AS position_counts
    FROM "grains" g
    CROSS JOIN LATERAL (VALUES
        ('all'::text, 'all'::text, NULL::uuid, NULL::uuid),
        ('r:' || g.region_id::text, 'region', g.region_id, NULL::uuid),
        ('s:' || g.season_id::text, 'season', g.region_id, g.season_id)
    ) sc(scope_key, scope_kind, scope_region_id, scope_season_id)
    CROSS JOIN LATERAL (VALUES
        ('points'::text, g.points),
        ('kills', g.kills),
        ('ape_kills', g.ape_kills),
        ('delay_kills', g.delay_kills),
        ('quick_kills', g.quick_kills),
        ('wipes_tools', g.wipes_tools),
        ('assists', g.assists),
        ('blocks', g.blocks),
        ('kill_blocks', g.kill_blocks),
        ('block_touches', g.block_touches),
        ('receives', g.receives),
        ('digs', g.digs),
        ('dives', g.dives),
        ('aces', g.aces),
        ('errors', g.errors)
    ) c(category, value)
    WHERE c.value > 0
      AND NOT (g.subject = 'team' AND c.category = 'points')
),
"ranked" AS (
    SELECT
        u.*,
        rank() OVER (
            PARTITION BY u.scope_key, u.grain, u.subject, u.category
            ORDER BY u.value DESC
        )::int AS rank,
        row_number() OVER (
            PARTITION BY u.scope_key, u.grain, u.subject, u.category
            ORDER BY u.value DESC, u.played_at ASC, COALESCE(u.player_id, u.team_id), u.match_id NULLS LAST, u.set_number NULLS LAST
        )::int AS row_num,
        count(*) OVER (
            PARTITION BY u.scope_key, u.grain, u.subject, u.category, u.value
        )::int AS value_count
    FROM "unpivoted" u
)
SELECT
    r.scope_key,
    r.scope_kind,
    r.scope_region_id,
    r.scope_season_id,
    r.grain,
    r.subject,
    r.category,
    r.row_num,
    r.rank,
    r.value,
    GREATEST(0, r.rank + r.value_count - 1 - 5) AS tied_beyond,
    r.player_id,
    r.team_id,
    r.opponent_team_id,
    r.match_id,
    r.set_number,
    r.season_id AS record_season_id,
    r.region_id AS record_region_id,
    r.played_at,
    r.sets_played,
    r.matches_played,
    r.position_counts
FROM "ranked" r
WHERE r.row_num <= 5;

ALTER MATERIALIZED VIEW "public"."mv_records" OWNER TO "postgres";

CREATE UNIQUE INDEX "mv_records_scope_rank_key"
    ON "public"."mv_records" ("scope_key", "grain", "subject", "category", "row_num");

CREATE OR REPLACE VIEW "public"."v_records" AS
SELECT
    r.scope_key,
    r.scope_kind,
    r.scope_region_id,
    r.scope_season_id,
    r.grain,
    r.subject,
    r.category,
    r.row_num,
    r.rank,
    r.value,
    r.tied_beyond,
    r.player_id,
    p.username AS player_username,
    p.display_name AS player_display_name,
    p.avatar_url AS player_avatar_url,
    r.team_id,
    t.name AS team_name,
    t.slug AS team_slug,
    t.logo_url AS team_logo_url,
    t.logo_bg_removed AS team_logo_bg_removed,
    r.opponent_team_id,
    o.name AS opponent_team_name,
    o.slug AS opponent_team_slug,
    r.match_id,
    m.match_code,
    r.set_number,
    r.record_season_id,
    s.name AS season_name,
    s.slug AS season_slug,
    s.season_number,
    (s.end_date IS NULL OR s.end_date > now()) AS season_active,
    r.record_region_id,
    rg.code AS region_code,
    r.played_at,
    r.sets_played,
    r.matches_played,
    r.position_counts
FROM "public"."mv_records" r
LEFT JOIN "public"."players" p ON p.id = r.player_id
LEFT JOIN "public"."teams" t ON t.id = r.team_id
LEFT JOIN "public"."teams" o ON o.id = r.opponent_team_id
LEFT JOIN "public"."matches" m ON m.id = r.match_id
LEFT JOIN "public"."seasons" s ON s.id = r.record_season_id
LEFT JOIN "public"."regions" rg ON rg.id = r.record_region_id;

ALTER VIEW "public"."v_records" OWNER TO "postgres";

CREATE OR REPLACE FUNCTION "public"."refresh_records"()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM "public"."user_roles"
        WHERE "user_roles"."user_id" = (SELECT "auth"."uid"())
          AND "user_roles"."role" = ANY (ARRAY['admin'::text, 'super_admin'::text, 'stat_tracker'::text])
    ) THEN
        RAISE EXCEPTION 'not authorized to refresh records' USING ERRCODE = '42501';
    END IF;

    REFRESH MATERIALIZED VIEW CONCURRENTLY "public"."mv_records";
END;
$$;

ALTER FUNCTION "public"."refresh_records"() OWNER TO "postgres";

REVOKE ALL ON FUNCTION "public"."refresh_records"() FROM PUBLIC;
REVOKE ALL ON FUNCTION "public"."refresh_records"() FROM "anon";
GRANT EXECUTE ON FUNCTION "public"."refresh_records"() TO "authenticated";
GRANT EXECUTE ON FUNCTION "public"."refresh_records"() TO "service_role";

REVOKE ALL ON TABLE "public"."mv_records" FROM "anon", "authenticated";
GRANT SELECT ON TABLE "public"."mv_records" TO "anon", "authenticated";
GRANT ALL ON TABLE "public"."mv_records" TO "service_role";

REVOKE ALL ON TABLE "public"."v_records" FROM "anon", "authenticated";
GRANT SELECT ON TABLE "public"."v_records" TO "anon", "authenticated";
GRANT ALL ON TABLE "public"."v_records" TO "service_role";
