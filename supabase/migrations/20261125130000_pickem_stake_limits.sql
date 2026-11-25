ALTER TABLE "public"."pickem_settings"
    ADD COLUMN "stake_min" integer NOT NULL DEFAULT 1 CHECK ("stake_min" >= 1),
    ADD COLUMN "stake_max" integer NOT NULL DEFAULT 1000,
    ADD CONSTRAINT "pickem_settings_stake_range" CHECK ("stake_max" >= "stake_min");
