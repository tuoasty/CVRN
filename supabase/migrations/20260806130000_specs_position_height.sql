ALTER TABLE "public"."specs" ADD COLUMN "position" "text" NOT NULL DEFAULT 'OH';
ALTER TABLE "public"."specs" ADD COLUMN "height" integer NOT NULL DEFAULT 79;

ALTER TABLE "public"."specs" ALTER COLUMN "position" DROP DEFAULT;
ALTER TABLE "public"."specs" ALTER COLUMN "height" DROP DEFAULT;

ALTER TABLE "public"."specs"
  ADD CONSTRAINT "specs_position_check" CHECK ("position" IN ('OH', 'OP', 'MB', 'S', 'L'));
ALTER TABLE "public"."specs"
  ADD CONSTRAINT "specs_height_check" CHECK ("height" BETWEEN 48 AND 96);
