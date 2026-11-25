CREATE TYPE "public"."pickem_pick_event_kind" AS ENUM ('placed', 'changed', 'claimed');

CREATE TABLE "public"."pickem_pick_events" (
    "id"                    bigint                              GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    "pick_id"               uuid                                NOT NULL REFERENCES "public"."pickem_picks"("id") ON DELETE CASCADE,
    "market_id"             uuid                                NOT NULL,
    "roblox_user_id"        text                                NOT NULL,
    "kind"                  "public"."pickem_pick_event_kind"   NOT NULL,
    "outcome_key"           text                                NOT NULL,
    "stake"                 integer                             NOT NULL,
    "previous_outcome_key"  text,
    "previous_stake"        integer,
    "charged"               integer,
    "payout"                integer,
    "request_id"            text,
    "created_at"            timestamptz                         NOT NULL DEFAULT now()
);

CREATE INDEX "pickem_pick_events_pick_idx" ON "public"."pickem_pick_events" ("pick_id", "id");
CREATE INDEX "pickem_pick_events_market_idx" ON "public"."pickem_pick_events" ("market_id", "id");
CREATE INDEX "pickem_pick_events_user_idx" ON "public"."pickem_pick_events" ("roblox_user_id", "id");

ALTER TABLE "public"."pickem_pick_events" ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON TABLE "public"."pickem_pick_events" FROM "anon";
REVOKE INSERT, UPDATE, DELETE ON TABLE "public"."pickem_pick_events" FROM "authenticated";

CREATE POLICY "admin select pickem_pick_events" ON "public"."pickem_pick_events"
    FOR SELECT TO "authenticated" USING ((SELECT "public"."has_group"('admin')));

CREATE OR REPLACE FUNCTION "public"."log_pickem_pick_event"()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET "search_path" = ''
AS $$
BEGIN
    IF TG_OP = 'INSERT' THEN
        INSERT INTO "public"."pickem_pick_events" ("pick_id", "market_id", "roblox_user_id", "kind", "outcome_key", "stake", "charged", "request_id")
        VALUES (NEW."id", NEW."market_id", NEW."roblox_user_id", 'placed', NEW."outcome_key", NEW."stake", NEW."last_charged", NEW."last_request_id");
    ELSIF NEW."outcome_key" IS DISTINCT FROM OLD."outcome_key" OR NEW."stake" IS DISTINCT FROM OLD."stake" THEN
        INSERT INTO "public"."pickem_pick_events" ("pick_id", "market_id", "roblox_user_id", "kind", "outcome_key", "stake", "previous_outcome_key", "previous_stake", "charged", "request_id")
        VALUES (NEW."id", NEW."market_id", NEW."roblox_user_id", 'changed', NEW."outcome_key", NEW."stake", OLD."outcome_key", OLD."stake", NEW."last_charged", NEW."last_request_id");
    ELSIF NEW."claimed_at" IS NOT NULL AND OLD."claimed_at" IS NULL THEN
        INSERT INTO "public"."pickem_pick_events" ("pick_id", "market_id", "roblox_user_id", "kind", "outcome_key", "stake", "payout")
        VALUES (NEW."id", NEW."market_id", NEW."roblox_user_id", 'claimed', NEW."outcome_key", NEW."stake", NEW."payout");
    END IF;
    RETURN NULL;
END;
$$;

REVOKE EXECUTE ON FUNCTION "public"."log_pickem_pick_event"() FROM "public", "anon", "authenticated";

CREATE TRIGGER "pickem_picks_log_event"
    AFTER INSERT OR UPDATE ON "public"."pickem_picks"
    FOR EACH ROW EXECUTE FUNCTION "public"."log_pickem_pick_event"();
