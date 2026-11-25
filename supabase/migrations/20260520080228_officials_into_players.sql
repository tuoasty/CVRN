
ALTER TABLE "public"."match_officials"
    DROP CONSTRAINT match_officials_official_id_fkey;

WITH mapping AS (
    INSERT INTO "public"."players" (
        roblox_user_id, username, display_name, avatar_url, last_synced_at, created_at, updated_at
    )
    SELECT
        o.roblox_user_id,
        o.username,
        o.display_name,
        o.avatar_url,
        o.last_synced_at,
        o.created_at,
        o.updated_at
    FROM "public"."officials" o
    ON CONFLICT (roblox_user_id) DO UPDATE SET
        username      = EXCLUDED.username,
        display_name  = EXCLUDED.display_name,
        avatar_url    = EXCLUDED.avatar_url,
        last_synced_at = EXCLUDED.last_synced_at
    RETURNING id, roblox_user_id
),
official_to_player AS (
    SELECT o.id AS old_official_id, m.id AS new_player_id
    FROM "public"."officials" o
    JOIN mapping m ON m.roblox_user_id = o.roblox_user_id
)

UPDATE "public"."match_officials" mo
SET official_id = otp.new_player_id
FROM official_to_player otp
WHERE mo.official_id = otp.old_official_id;

ALTER TABLE "public"."match_officials"
    RENAME COLUMN official_id TO player_id;

ALTER TABLE "public"."match_officials"
    ADD CONSTRAINT match_officials_player_id_fkey
    FOREIGN KEY (player_id) REFERENCES "public"."players"(id) ON DELETE CASCADE;

DROP FUNCTION IF EXISTS "public"."search_officials_with_similarity"(text);
DROP TABLE "public"."officials";
