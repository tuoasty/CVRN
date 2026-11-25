ALTER TABLE "public"."player_team_seasons"
  ADD COLUMN "position" "text";

ALTER TABLE "public"."player_team_seasons"
  ADD CONSTRAINT "player_team_seasons_position_check"
  CHECK (("position" IS NULL) OR ("position" = ANY (ARRAY['OH'::"text", 'OP'::"text", 'MB'::"text", 'S'::"text", 'L'::"text"])));

ALTER TABLE "public"."players" DROP COLUMN "position";
