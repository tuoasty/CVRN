CREATE OR REPLACE FUNCTION reapply_match_result(
  p_match_id            uuid,
  p_sets                jsonb,
  p_home_sets_won       int,
  p_away_sets_won       int,
  p_home_lvr            numeric,
  p_away_lvr            numeric,
  p_mvp_player_id       uuid,
  p_loser_mvp_player_id uuid,
  p_is_forfeit          bool
)
RETURNS matches
LANGUAGE plpgsql
AS $$
DECLARE
  v_start_bracket playoff_brackets%ROWTYPE;
  v_match         matches%ROWTYPE;
BEGIN
  DELETE FROM match_sets WHERE match_id = p_match_id;

  INSERT INTO match_sets (match_id, set_number, home_score, away_score)
  SELECT
    p_match_id,
    (s->>'set_number')::int,
    (s->>'home_score')::int,
    (s->>'away_score')::int
  FROM jsonb_array_elements(p_sets) AS s;

  UPDATE matches SET
    home_sets_won        = p_home_sets_won,
    away_sets_won        = p_away_sets_won,
    home_team_lvr        = p_home_lvr,
    away_team_lvr        = p_away_lvr,
    match_mvp_player_id  = p_mvp_player_id,
    loser_mvp_player_id  = p_loser_mvp_player_id,
    is_forfeit           = p_is_forfeit
  WHERE id = p_match_id;

  SELECT * INTO v_start_bracket FROM playoff_brackets WHERE match_id = p_match_id;

  IF FOUND THEN
    CREATE TEMP TABLE _downstream ON COMMIT DROP AS
    WITH RECURSIVE downstream(bracket_id, match_id, next_bracket_id, loser_next_bracket_id) AS (
      SELECT pb.id, pb.match_id, pb.next_bracket_id, pb.loser_next_bracket_id
      FROM playoff_brackets pb
      WHERE pb.id = v_start_bracket.next_bracket_id
         OR pb.id = v_start_bracket.loser_next_bracket_id

      UNION ALL

      SELECT pb.id, pb.match_id, pb.next_bracket_id, pb.loser_next_bracket_id
      FROM playoff_brackets pb
      JOIN downstream d ON pb.id = d.next_bracket_id OR pb.id = d.loser_next_bracket_id
    )
    SELECT bracket_id, match_id FROM downstream;

    DELETE FROM match_sets
    WHERE match_id IN (SELECT match_id FROM _downstream);

    UPDATE matches SET
      status              = 'pending',
      home_team_id        = NULL,
      away_team_id        = NULL,
      home_sets_won       = NULL,
      away_sets_won       = NULL,
      home_team_lvr       = NULL,
      away_team_lvr       = NULL,
      match_mvp_player_id = NULL,
      loser_mvp_player_id = NULL,
      is_forfeit          = false,
      scheduled_at        = NULL
    WHERE id IN (SELECT match_id FROM _downstream);

    UPDATE playoff_brackets SET
      seed_home = NULL,
      seed_away = NULL
    WHERE id IN (SELECT bracket_id FROM _downstream);

    DROP TABLE _downstream;

    PERFORM advance_playoff_winner(p_match_id);
  END IF;

  SELECT * INTO v_match FROM matches WHERE id = p_match_id;
  RETURN v_match;
END;
$$;
