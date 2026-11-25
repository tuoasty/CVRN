CREATE TABLE "public"."game_spec_skips" (
    "game_key"   text        NOT NULL,
    "skipped_by" uuid,
    "skipped_at" timestamptz NOT NULL DEFAULT now(),
    CONSTRAINT "game_spec_skips_pkey" PRIMARY KEY ("game_key"),
    CONSTRAINT "game_spec_skips_skipped_by_fkey" FOREIGN KEY ("skipped_by") REFERENCES "auth"."users"("id") ON DELETE SET NULL
);

ALTER TABLE "public"."game_spec_skips" ENABLE ROW LEVEL SECURITY;

CREATE POLICY "anyone can read game_spec_skips" ON "public"."game_spec_skips"
    FOR SELECT TO "authenticated", "anon" USING (true);

CREATE POLICY "admins can insert game_spec_skips" ON "public"."game_spec_skips"
    FOR INSERT TO "authenticated"
    WITH CHECK ((EXISTS (SELECT 1 FROM "public"."user_roles"
        WHERE (("user_roles"."user_id" = (SELECT "auth"."uid"() AS "uid"))
            AND ("user_roles"."role" = ANY (ARRAY['admin'::"text", 'super_admin'::"text"]))))));

CREATE POLICY "admins can update game_spec_skips" ON "public"."game_spec_skips"
    FOR UPDATE TO "authenticated"
    USING ((EXISTS (SELECT 1 FROM "public"."user_roles"
        WHERE (("user_roles"."user_id" = (SELECT "auth"."uid"() AS "uid"))
            AND ("user_roles"."role" = ANY (ARRAY['admin'::"text", 'super_admin'::"text"]))))));

CREATE POLICY "admins can delete game_spec_skips" ON "public"."game_spec_skips"
    FOR DELETE TO "authenticated"
    USING ((EXISTS (SELECT 1 FROM "public"."user_roles"
        WHERE (("user_roles"."user_id" = (SELECT "auth"."uid"() AS "uid"))
            AND ("user_roles"."role" = ANY (ARRAY['admin'::"text", 'super_admin'::"text"]))))));

CREATE OR REPLACE FUNCTION "public"."publish_game_data"(
  "p_datasets" "jsonb",
  "p_spec_ops" "jsonb"
)
RETURNS void
LANGUAGE "plpgsql"
SECURITY INVOKER
SET "search_path" = ''
AS $$
DECLARE
  v_op jsonb;
  v_updated integer;
BEGIN
  INSERT INTO public.game_datasets (kind, payload, source_text, imported_by, imported_at)
    SELECT d->>'kind', d->'payload', d->>'source_text', (d->>'imported_by')::uuid, (d->>'imported_at')::timestamptz
    FROM jsonb_array_elements(COALESCE(p_datasets, '[]'::jsonb)) AS d
  ON CONFLICT (kind) DO UPDATE
    SET payload = EXCLUDED.payload,
        source_text = EXCLUDED.source_text,
        imported_by = EXCLUDED.imported_by,
        imported_at = EXCLUDED.imported_at;

  IF jsonb_array_length(COALESCE(p_spec_ops, '[]'::jsonb)) = 0 THEN
    RETURN;
  END IF;

  DELETE FROM public.game_spec_skips
    WHERE game_key IN (SELECT o->>'game_key' FROM jsonb_array_elements(p_spec_ops) AS o WHERE o->>'op' = 'unskip');

  INSERT INTO public.game_spec_skips (game_key, skipped_by)
    SELECT o->>'game_key', (SELECT auth.uid())
    FROM jsonb_array_elements(p_spec_ops) AS o
    WHERE o->>'op' = 'skip'
  ON CONFLICT (game_key) DO NOTHING;

  UPDATE public.specs
    SET game_key = NULL
    WHERE game_key IN (SELECT o->>'game_key' FROM jsonb_array_elements(p_spec_ops) AS o WHERE o->>'op' IN ('link', 'create'))
       OR id IN (SELECT (o->>'spec_id')::uuid FROM jsonb_array_elements(p_spec_ops) AS o WHERE o->>'op' = 'link');

  FOR v_op IN SELECT * FROM jsonb_array_elements(p_spec_ops) LOOP
    IF v_op->>'op' = 'link' THEN
      UPDATE public.specs
        SET game_key = v_op->>'game_key',
            height = (v_op->>'height')::integer,
            name = COALESCE(v_op->>'name', name),
            updated_at = now()
        WHERE id = (v_op->>'spec_id')::uuid;
      GET DIAGNOSTICS v_updated = ROW_COUNT;
      IF v_updated = 0 THEN
        RAISE EXCEPTION 'spec % not found', v_op->>'spec_id';
      END IF;
    ELSIF v_op->>'op' = 'create' THEN
      INSERT INTO public.specs (name, stars, position, height, game_key)
        VALUES (v_op->>'name', (v_op->>'stars')::smallint, v_op->>'position', (v_op->>'height')::integer, v_op->>'game_key');
    ELSIF v_op->>'op' NOT IN ('skip', 'unskip') THEN
      RAISE EXCEPTION 'unknown spec op %', v_op->>'op';
    END IF;
  END LOOP;
END;
$$;
