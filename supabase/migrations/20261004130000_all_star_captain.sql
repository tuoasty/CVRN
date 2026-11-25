ALTER TABLE "public"."season_awards"
  ADD COLUMN "all_star_captain" boolean NOT NULL DEFAULT false;

ALTER TABLE "public"."season_awards"
  ADD CONSTRAINT "season_awards_all_star_captain_starter_check" CHECK (
    NOT "all_star_captain" OR ("category" = 'all_star' AND "all_star_slot" = 'starter')
  );

CREATE UNIQUE INDEX "season_awards_one_all_star_captain_per_team"
  ON "public"."season_awards" ("season_id", "all_star_team")
  WHERE "all_star_captain";
