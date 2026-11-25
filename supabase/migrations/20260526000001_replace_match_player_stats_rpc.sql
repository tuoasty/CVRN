
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
      ape_kills, ape_attempts, delay_kills, quick_kills, wipes_tools,
      kill_attempts, spiking_errors,
      assists, setting_errors,
      kill_blocks, block_touches,
      serve_receives, digs, block_follows, dives,
      aces, service_errors,
      misc_errors
    )
    SELECT
      (r->>'match_id')::uuid,
      (r->>'player_id')::uuid,
      (r->>'team_id')::uuid,
      (r->>'set_number')::int,
      (r->>'ape_kills')::int, (r->>'ape_attempts')::int,
      (r->>'delay_kills')::int, (r->>'quick_kills')::int, (r->>'wipes_tools')::int,
      (r->>'kill_attempts')::int, (r->>'spiking_errors')::int,
      (r->>'assists')::int, (r->>'setting_errors')::int,
      (r->>'kill_blocks')::int, (r->>'block_touches')::int,
      (r->>'serve_receives')::int, (r->>'digs')::int,
      (r->>'block_follows')::int, (r->>'dives')::int,
      (r->>'aces')::int, (r->>'service_errors')::int,
      (r->>'misc_errors')::int
    FROM jsonb_array_elements(p_rows) AS r;
  END IF;
END;
$$;
