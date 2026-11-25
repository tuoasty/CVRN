ALTER TABLE "public"."update_log_images"
    ADD COLUMN "caption" text;

ALTER TABLE "public"."update_log_images"
    ADD CONSTRAINT "update_log_images_caption_length" CHECK ("caption" IS NULL OR char_length("caption") <= 200);

ALTER TABLE "public"."update_log_images"
    ADD CONSTRAINT "update_log_images_handle_format" CHECK ("handle" ~ '^[a-z0-9]+(-[a-z0-9]+)*$' AND char_length("handle") <= 40);
