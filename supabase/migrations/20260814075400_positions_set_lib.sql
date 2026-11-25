ALTER TABLE "public"."specs" DROP CONSTRAINT "specs_position_check";
ALTER TABLE "public"."player_team_seasons" DROP CONSTRAINT "player_team_seasons_position_check";

update "public"."specs" set "position" = 'SET' where "position" = 'S';
update "public"."specs" set "position" = 'LIB' where "position" = 'L';
update "public"."specs" set "position" = 'OPP' where "position" = 'OP';

update "public"."player_team_seasons" set "position" = 'SET' where "position" = 'S';
update "public"."player_team_seasons" set "position" = 'LIB' where "position" = 'L';
update "public"."player_team_seasons" set "position" = 'OPP' where "position" = 'OP';

ALTER TABLE "public"."specs"
  ADD CONSTRAINT "specs_position_check" CHECK ("position" IN ('OH', 'OPP', 'MB', 'SET', 'LIB'));

ALTER TABLE "public"."player_team_seasons"
  ADD CONSTRAINT "player_team_seasons_position_check"
  CHECK (("position" IS NULL) OR ("position" = ANY (ARRAY['OH'::"text", 'OPP'::"text", 'MB'::"text", 'SET'::"text", 'LIB'::"text"])));
