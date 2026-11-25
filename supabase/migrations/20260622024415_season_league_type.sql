ALTER TABLE "public"."seasons"
  ADD COLUMN "league_type" text NOT NULL DEFAULT 'main'
  CHECK (league_type IN ('main', 'side'));