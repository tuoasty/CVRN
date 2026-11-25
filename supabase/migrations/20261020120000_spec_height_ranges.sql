ALTER TABLE "public"."spec_bonuses"
  ADD COLUMN "height_range_by_star" "jsonb" NOT NULL DEFAULT '{"3": 2, "4": 2, "5": 2}'::"jsonb";
