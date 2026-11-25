
ALTER TABLE "public"."playoff_brackets"
    DROP CONSTRAINT IF EXISTS "playoff_brackets_round_check";

ALTER TABLE "public"."playoff_brackets"
    ADD COLUMN "playoff_group" "text" NOT NULL DEFAULT 'upper';

ALTER TABLE "public"."playoff_brackets"
    ADD CONSTRAINT "playoff_brackets_playoff_group_check"
    CHECK (("playoff_group" = ANY (ARRAY['upper'::"text", 'lower'::"text"])));
