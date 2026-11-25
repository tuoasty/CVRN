
ALTER TABLE "public"."matches"
  ADD COLUMN "home_team_bonus" numeric DEFAULT 0,
  ADD COLUMN "away_team_bonus" numeric DEFAULT 0,
  ADD COLUMN "point_diff" numeric;
