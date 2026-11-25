ALTER TABLE "public"."media_posts"
    ADD COLUMN "is_pinned"  boolean     NOT NULL DEFAULT false,
    ADD COLUMN "pinned_at"  timestamptz;
