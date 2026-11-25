ALTER TABLE "public"."media_posts"
  ADD COLUMN "image_width" integer,
  ADD COLUMN "image_height" integer;

ALTER TABLE "public"."media_posts"
  ADD CONSTRAINT "media_posts_image_dims_positive"
  CHECK (("image_width" IS NULL OR "image_width" > 0) AND ("image_height" IS NULL OR "image_height" > 0));
