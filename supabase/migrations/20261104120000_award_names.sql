CREATE TABLE "public"."award_names" (
    "name"       text        NOT NULL,
    "sort_order" integer     NOT NULL DEFAULT 0,
    "created_at" timestamptz NOT NULL DEFAULT now(),
    "created_by" uuid        DEFAULT auth.uid(),
    CONSTRAINT "award_names_pkey" PRIMARY KEY ("name"),
    CONSTRAINT "award_names_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "auth"."users"("id") ON DELETE SET NULL,
    CONSTRAINT "award_names_name_check" CHECK ("name" = btrim("name") AND "name" <> '')
);

CREATE UNIQUE INDEX "award_names_name_lower_key" ON "public"."award_names" (lower("name"));

ALTER TABLE "public"."award_names" ENABLE ROW LEVEL SECURITY;

CREATE POLICY "anyone can read award_names" ON "public"."award_names"
    FOR SELECT TO "authenticated", "anon" USING (true);

CREATE POLICY "admins can insert award_names" ON "public"."award_names"
    FOR INSERT TO "authenticated"
    WITH CHECK ((EXISTS (SELECT 1 FROM "public"."user_roles"
        WHERE (("user_roles"."user_id" = (SELECT "auth"."uid"() AS "uid"))
            AND ("user_roles"."role" = ANY (ARRAY['admin'::"text", 'super_admin'::"text"]))))));

INSERT INTO "public"."award_names" ("name", "sort_order", "created_by") VALUES
    ('Most Valuable Player', 10, NULL),
    ('Finals MVP', 20, NULL),
    ('Offensive Player of the Season', 30, NULL),
    ('Defensive Player of the Season', 40, NULL),
    ('Best Outside Hitter', 50, NULL),
    ('Best Opposite Hitter', 60, NULL),
    ('Best Middle Blocker', 70, NULL),
    ('Best Setter', 80, NULL),
    ('Best Libero', 90, NULL),
    ('Best Aper', 100, NULL),
    ('Best Spiker', 110, NULL),
    ('Best Blocker', 120, NULL),
    ('Best Server', 130, NULL),
    ('Rookie of the Season', 140, NULL),
    ('Most Improved Player', 150, NULL),
    ('Playoff Rising Star', 160, NULL);

UPDATE "public"."season_awards"
SET "award_name" = 'Best Middle Blocker'
WHERE "category" = 'individual_winners' AND "award_name" = 'Best Middle';

DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM "public"."season_awards" a
        WHERE a."category" = 'individual_winners'
          AND NOT EXISTS (SELECT 1 FROM "public"."award_names" n WHERE n."name" = a."award_name")
    ) THEN
        RAISE EXCEPTION 'season_awards has individual award names that are not on the list';
    END IF;
END $$;

CREATE OR REPLACE FUNCTION "public"."check_individual_award_name"()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = ''
AS $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM "public"."award_names" WHERE "name" = NEW."award_name") THEN
        RAISE EXCEPTION '"%" is not on the award list', NEW."award_name" USING ERRCODE = '23503';
    END IF;
    RETURN NEW;
END;
$$;

ALTER FUNCTION "public"."check_individual_award_name"() OWNER TO "postgres";

CREATE TRIGGER "season_awards_individual_name_check"
    BEFORE INSERT OR UPDATE OF "award_name", "category" ON "public"."season_awards"
    FOR EACH ROW
    WHEN (NEW."category" = 'individual_winners')
    EXECUTE FUNCTION "public"."check_individual_award_name"();
