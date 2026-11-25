CREATE OR REPLACE FUNCTION void_match(p_match_id uuid)
RETURNS matches
LANGUAGE plpgsql
AS $$
DECLARE
  v_start_bracket playoff_brackets%ROWTYPE;
  v_match         matches%ROWTYPE;
BEGIN
  DELETE FROM match_sets    WHERE match_id = p_match_id;
  DELETE FROM match_officials WHERE match_id = p_match_id;

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
  END IF;

  UPDATE matches SET
    status              = 'pending',
    home_sets_won       = NULL,
    away_sets_won       = NULL,
    home_team_lvr       = NULL,
    away_team_lvr       = NULL,
    match_mvp_player_id = NULL,
    loser_mvp_player_id = NULL,
    is_forfeit          = false,
    scheduled_at        = NULL
  WHERE id = p_match_id;

  SELECT * INTO v_match FROM matches WHERE id = p_match_id;
  RETURN v_match;
END;
$$;
