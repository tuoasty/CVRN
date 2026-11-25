ALTER TABLE "public"."overall_scalings" ALTER COLUMN "floor" SET DEFAULT 60;
ALTER TABLE "public"."overall_scalings" ALTER COLUMN "ceil" SET DEFAULT 99;
ALTER TABLE "public"."overall_scalings" ALTER COLUMN "curve" SET DEFAULT 1;

UPDATE "public"."overall_scalings"
SET "floor" = 60, "ceil" = 99, "curve" = 1, "updated_at" = now()
WHERE "floor" <> 60 OR "ceil" <> 99 OR "curve" <> 1;
