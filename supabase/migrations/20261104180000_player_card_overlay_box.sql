ALTER TABLE "public"."player_card_overlays"
    DROP CONSTRAINT "player_card_overlays_placement_check",
    DROP COLUMN "offset_x",
    DROP COLUMN "offset_y",
    DROP COLUMN "scale",
    ADD COLUMN "box_x"   integer,
    ADD COLUMN "box_y"   integer,
    ADD COLUMN "box_w"   integer,
    ADD COLUMN "box_h"   integer,
    ADD COLUMN "image_x" integer,
    ADD COLUMN "image_y" integer,
    ADD COLUMN "image_w" integer,
    ADD CONSTRAINT "player_card_overlays_placement_check" CHECK (
        (
            "box_x" IS NULL AND "box_y" IS NULL AND "box_w" IS NULL AND "box_h" IS NULL
            AND "image_x" IS NULL AND "image_y" IS NULL AND "image_w" IS NULL
        )
        OR (
            "box_x" IS NOT NULL AND "box_y" IS NOT NULL AND "box_w" > 0 AND "box_h" > 0
            AND "image_x" IS NOT NULL AND "image_y" IS NOT NULL AND "image_w" > 0
        )
    );
