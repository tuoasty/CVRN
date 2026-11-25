ALTER TABLE "public"."regions"
  ADD COLUMN "standing_method" text NOT NULL DEFAULT 'lvr'
  CHECK (standing_method IN ('lvr', 'points'));

UPDATE "public"."regions" SET "standing_method" = 'points' WHERE "code" = 'NA';
