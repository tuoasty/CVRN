
CREATE OR REPLACE FUNCTION "public"."search_players_with_similarity"("search_term" "text") RETURNS TABLE("id" "uuid", "roblox_user_id" "text", "username" "text", "display_name" "text", "avatar_url" "text", "similarity_score" real)
    LANGUAGE "plpgsql"
    AS $$
BEGIN
    SET pg_trgm.similarity_threshold = 0.3;

    RETURN QUERY
    SELECT
        p.id,
        p.roblox_user_id::TEXT,
        p.username,
        p.display_name,
        p.avatar_url,
        GREATEST(
            COALESCE(similarity(LOWER(p.username), search_term), 0),
            COALESCE(similarity(LOWER(p.display_name), search_term), 0)
        ) AS similarity_score
    FROM players p
    WHERE
        LOWER(p.username) % search_term
        OR LOWER(p.display_name) % search_term
        OR LOWER(p.username) ILIKE '%' || search_term || '%'
        OR LOWER(p.display_name) ILIKE '%' || search_term || '%'
    ORDER BY similarity_score DESC
    LIMIT 20;
END;
$$;
