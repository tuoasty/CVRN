
ALTER TABLE "public"."regions"
  DROP CONSTRAINT IF EXISTS "regions_standing_method_check";

ALTER TABLE "public"."regions"
  ADD CONSTRAINT "regions_standing_method_check"
  CHECK (standing_method IN ('lvr', 'points', 'points_without_bonus'));

UPDATE "public"."regions" SET "standing_method" = 'points_without_bonus' WHERE "code" = 'EU';
