ALTER TABLE "public"."player_card_overlays"
    ADD COLUMN "offset_x" double precision,
    ADD COLUMN "offset_y" double precision,
    ADD COLUMN "scale"    double precision,
    ADD CONSTRAINT "player_card_overlays_placement_check" CHECK (
        ("offset_x" IS NULL AND "offset_y" IS NULL AND "scale" IS NULL)
        OR ("offset_x" IS NOT NULL AND "offset_y" IS NOT NULL AND "scale" > 0)
    );
