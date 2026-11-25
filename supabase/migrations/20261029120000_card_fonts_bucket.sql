INSERT INTO "storage"."buckets" ("id", "name", "public")
VALUES ('card-fonts', 'card-fonts', false)
ON CONFLICT ("id") DO NOTHING;
