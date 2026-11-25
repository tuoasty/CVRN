CREATE OR REPLACE VIEW "public"."v_records" AS
SELECT
    r.scope_key,
    r.scope_kind,
    r.scope_region_id,
    r.scope_season_id,
    r.scope_season_number,
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
    r.position_counts,
    pb.round AS match_round
FROM "public"."mv_records" r
LEFT JOIN "public"."players" p ON p.id = r.player_id
LEFT JOIN "public"."teams" t ON t.id = r.team_id
LEFT JOIN "public"."teams" o ON o.id = r.opponent_team_id
LEFT JOIN "public"."matches" m ON m.id = r.match_id
LEFT JOIN "public"."seasons" s ON s.id = r.record_season_id
LEFT JOIN "public"."regions" rg ON rg.id = r.record_region_id
LEFT JOIN "public"."playoff_brackets" pb ON pb.match_id = r.match_id;
