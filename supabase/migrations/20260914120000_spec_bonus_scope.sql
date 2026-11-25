ALTER TABLE "public"."spec_bonuses"
  ADD COLUMN "scope_count"   boolean NOT NULL DEFAULT true,
  ADD COLUMN "scope_per_set" boolean NOT NULL DEFAULT false,
  ADD COLUMN "scope_pct"     boolean NOT NULL DEFAULT false;
