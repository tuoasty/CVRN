ALTER TABLE "public"."spec_winners" DROP CONSTRAINT "spec_winners_stars_awarded_check";

ALTER TABLE "public"."spec_winners"
  ADD CONSTRAINT "spec_winners_stars_awarded_check" CHECK ("stars_awarded" BETWEEN 0 AND 5);
