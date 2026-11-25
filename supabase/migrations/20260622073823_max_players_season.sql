ALTER TABLE "public"."seasons"
  ADD COLUMN "max_players" integer NOT NULL DEFAULT 18
  CHECK ("max_players" >= 3);