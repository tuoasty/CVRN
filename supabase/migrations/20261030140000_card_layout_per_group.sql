ALTER TABLE "public"."card_groups"
    ADD COLUMN "canvas_width"  integer NOT NULL DEFAULT 1000,
    ADD COLUMN "canvas_height" integer NOT NULL DEFAULT 1400,
    ADD COLUMN "layers"        jsonb   NOT NULL DEFAULT '[]'::jsonb,
    ADD CONSTRAINT "card_groups_canvas_check" CHECK ("canvas_width" > 0 AND "canvas_height" > 0),
    ADD CONSTRAINT "card_groups_layers_array_check" CHECK (jsonb_typeof("layers") = 'array');

UPDATE "public"."card_groups" g
SET "layers"        = t.layers,
    "canvas_width"  = t.canvas_width,
    "canvas_height" = t.canvas_height
FROM (
    SELECT DISTINCT ON ("group_id") "group_id", "layers", "canvas_width", "canvas_height"
    FROM "public"."card_templates"
    ORDER BY "group_id", jsonb_array_length("layers") DESC, "min_ovr" DESC
) t
WHERE t.group_id = g.id;

ALTER TABLE "public"."card_templates"
    DROP COLUMN "layers",
    DROP COLUMN "canvas_width",
    DROP COLUMN "canvas_height",
    DROP COLUMN "fonts";
