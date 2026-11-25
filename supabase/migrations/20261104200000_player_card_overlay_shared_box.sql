ALTER TABLE "public"."player_card_overlays"
    DROP CONSTRAINT "player_card_overlays_placement_check",
    DROP COLUMN "box_x",
    DROP COLUMN "box_y",
    DROP COLUMN "box_w",
    DROP COLUMN "box_h",
    ADD CONSTRAINT "player_card_overlays_placement_check" CHECK (
        ("image_x" IS NULL AND "image_y" IS NULL AND "image_w" IS NULL)
        OR ("image_x" IS NOT NULL AND "image_y" IS NOT NULL AND "image_w" > 0)
    );
