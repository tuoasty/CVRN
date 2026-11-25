ALTER TABLE "public"."player_cards" DROP CONSTRAINT "player_cards_position_check";

ALTER TABLE "public"."player_cards"
    ADD CONSTRAINT "player_cards_position_check" CHECK ("position" IS NULL OR char_length("position") <= 3);
