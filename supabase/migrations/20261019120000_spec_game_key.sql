ALTER TABLE "public"."specs" ADD COLUMN "game_key" "text";

ALTER TABLE "public"."specs"
  ADD CONSTRAINT "specs_game_key_key" UNIQUE ("game_key");

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

  UPDATE public.specs
    SET game_key = NULL
    WHERE game_key IN (SELECT o->>'game_key' FROM jsonb_array_elements(p_spec_ops) AS o)
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
    ELSE
      RAISE EXCEPTION 'unknown spec op %', v_op->>'op';
    END IF;
  END LOOP;
END;
$$;

REVOKE ALL ON FUNCTION "public"."publish_game_data"("jsonb", "jsonb") FROM PUBLIC;
REVOKE ALL ON FUNCTION "public"."publish_game_data"("jsonb", "jsonb") FROM "anon";
GRANT EXECUTE ON FUNCTION "public"."publish_game_data"("jsonb", "jsonb") TO "authenticated";
GRANT EXECUTE ON FUNCTION "public"."publish_game_data"("jsonb", "jsonb") TO "service_role";
