ALTER TABLE "public"."specs" DROP CONSTRAINT "specs_position_check";
ALTER TABLE "public"."player_team_seasons" DROP CONSTRAINT "player_team_seasons_position_check";

ALTER TABLE "public"."specs" ALTER COLUMN "position" SET DEFAULT 'OUT';

update "public"."specs" set "position" = 'OUT' where "position" = 'OH';
update "public"."specs" set "position" = 'MID' where "position" = 'MB';

update "public"."player_team_seasons" set "position" = 'OUT' where "position" = 'OH';
update "public"."player_team_seasons" set "position" = 'MID' where "position" = 'MB';

update "public"."player_match_stats" set "position" = 'OUT' where "position" = 'OH';
update "public"."player_match_stats" set "position" = 'MID' where "position" = 'MB';

ALTER TABLE "public"."specs"
  ADD CONSTRAINT "specs_position_check" CHECK ("position" IN ('OUT', 'OPP', 'MID', 'SET', 'LIB'));

ALTER TABLE "public"."player_team_seasons"
  ADD CONSTRAINT "player_team_seasons_position_check"
  CHECK (("position" IS NULL) OR ("position" = ANY (ARRAY['OUT'::"text", 'OPP'::"text", 'MID'::"text", 'SET'::"text", 'LIB'::"text"])));
