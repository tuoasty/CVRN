CREATE OR REPLACE FUNCTION complete_match(
  p_match_id            uuid,
  p_sets                jsonb,
  p_home_sets_won       int,
  p_away_sets_won       int,
  p_home_lvr            numeric,
  p_away_lvr            numeric,
  p_mvp_player_id       uuid,
  p_loser_mvp_player_id uuid,
  p_is_forfeit          bool,
  p_scheduled_at        timestamptz
)
RETURNS matches
LANGUAGE plpgsql
AS $$
DECLARE
  v_match matches%ROWTYPE;
BEGIN
  INSERT INTO match_sets (match_id, set_number, home_score, away_score)
  SELECT
    p_match_id,
    (s->>'set_number')::int,
    (s->>'home_score')::int,
    (s->>'away_score')::int
  FROM jsonb_array_elements(p_sets) AS s;

  UPDATE matches SET
    status               = 'completed',
    home_sets_won        = p_home_sets_won,
    away_sets_won        = p_away_sets_won,
    home_team_lvr        = p_home_lvr,
    away_team_lvr        = p_away_lvr,
    match_mvp_player_id  = p_mvp_player_id,
    loser_mvp_player_id  = p_loser_mvp_player_id,
    is_forfeit           = p_is_forfeit,
    scheduled_at         = p_scheduled_at
  WHERE id = p_match_id;

  SELECT * INTO v_match FROM matches WHERE id = p_match_id;

  IF v_match.match_type = 'playoffs'
     AND v_match.home_team_id IS NOT NULL
     AND v_match.away_team_id IS NOT NULL
  THEN
    PERFORM advance_playoff_winner(p_match_id);
  END IF;

  SELECT * INTO v_match FROM matches WHERE id = p_match_id;
  RETURN v_match;
END;
$$;
