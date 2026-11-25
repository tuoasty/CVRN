CREATE OR REPLACE FUNCTION public.replace_match_player_stats(
  p_match_id uuid,
  p_rows     jsonb
)
RETURNS void
LANGUAGE plpgsql
SECURITY INVOKER
AS $$
BEGIN
  DELETE FROM public.player_match_stats WHERE match_id = p_match_id;

  IF p_rows IS NOT NULL AND jsonb_array_length(p_rows) > 0 THEN
    INSERT INTO public.player_match_stats (
      match_id, player_id, team_id, set_number,
      position,
      ape_kills, ape_attempts, delay_kills, quick_kills, wipes_tools,
      kill_attempts, spiking_errors,
      assists, setting_errors,
      kill_blocks, block_touches,
      digs, block_follows, dives,
      aces, jump_serve_aces, float_aces, service_errors,
      misc_errors, receive_errors
    )
    SELECT
      (r->>'match_id')::uuid,
      (r->>'player_id')::uuid,
      (r->>'team_id')::uuid,
      (r->>'set_number')::int,
      NULLIF(r->>'position', ''),
      COALESCE((r->>'ape_kills')::int, 0), COALESCE((r->>'ape_attempts')::int, 0),
      COALESCE((r->>'delay_kills')::int, 0), COALESCE((r->>'quick_kills')::int, 0), COALESCE((r->>'wipes_tools')::int, 0),
      COALESCE((r->>'kill_attempts')::int, 0), COALESCE((r->>'spiking_errors')::int, 0),
      COALESCE((r->>'assists')::int, 0), COALESCE((r->>'setting_errors')::int, 0),
      COALESCE((r->>'kill_blocks')::int, 0), COALESCE((r->>'block_touches')::int, 0),
      COALESCE((r->>'digs')::int, 0), COALESCE((r->>'block_follows')::int, 0), COALESCE((r->>'dives')::int, 0),
      COALESCE((r->>'aces')::int, 0), COALESCE((r->>'jump_serve_aces')::int, 0), COALESCE((r->>'float_aces')::int, 0), COALESCE((r->>'service_errors')::int, 0),
      COALESCE((r->>'misc_errors')::int, 0), COALESCE((r->>'receive_errors')::int, 0)
    FROM jsonb_array_elements(p_rows) AS r;
  END IF;
END;
$$;
