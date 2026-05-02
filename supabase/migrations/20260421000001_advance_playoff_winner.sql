CREATE OR REPLACE FUNCTION advance_playoff_winner(p_match_id uuid)
RETURNS void
LANGUAGE plpgsql
AS $$
DECLARE
  v_bracket  playoff_brackets%ROWTYPE;
  v_match    matches%ROWTYPE;
  v_winner_team_id uuid;
  v_loser_team_id  uuid;
  v_winner_seed    int;
  v_loser_seed     int;
  v_next_match_id  uuid;
BEGIN
  SELECT * INTO v_bracket FROM playoff_brackets WHERE match_id = p_match_id;
  IF NOT FOUND THEN RETURN; END IF;

  SELECT * INTO v_match FROM matches WHERE id = p_match_id;

  IF v_match.home_sets_won > v_match.away_sets_won THEN
    v_winner_team_id := v_match.home_team_id;
    v_loser_team_id  := v_match.away_team_id;
    v_winner_seed    := v_bracket.seed_home;
    v_loser_seed     := v_bracket.seed_away;
  ELSE
    v_winner_team_id := v_match.away_team_id;
    v_loser_team_id  := v_match.home_team_id;
    v_winner_seed    := v_bracket.seed_away;
    v_loser_seed     := v_bracket.seed_home;
  END IF;

  IF v_bracket.next_bracket_id IS NOT NULL THEN
    SELECT match_id INTO v_next_match_id
      FROM playoff_brackets WHERE id = v_bracket.next_bracket_id;

    UPDATE matches SET
      home_team_id = CASE WHEN v_bracket.winner_position = 'home' THEN v_winner_team_id ELSE home_team_id END,
      away_team_id = CASE WHEN v_bracket.winner_position = 'away' THEN v_winner_team_id ELSE away_team_id END
    WHERE id = v_next_match_id;

    UPDATE playoff_brackets SET
      seed_home = CASE WHEN v_bracket.winner_position = 'home' THEN v_winner_seed ELSE seed_home END,
      seed_away = CASE WHEN v_bracket.winner_position = 'away' THEN v_winner_seed ELSE seed_away END
    WHERE id = v_bracket.next_bracket_id;
  END IF;

  IF v_bracket.loser_next_bracket_id IS NOT NULL THEN
    SELECT match_id INTO v_next_match_id
      FROM playoff_brackets WHERE id = v_bracket.loser_next_bracket_id;

    UPDATE matches SET
      home_team_id = CASE WHEN v_bracket.loser_position = 'home' THEN v_loser_team_id ELSE home_team_id END,
      away_team_id = CASE WHEN v_bracket.loser_position = 'away' THEN v_loser_team_id ELSE away_team_id END
    WHERE id = v_next_match_id;

    UPDATE playoff_brackets SET
      seed_home = CASE WHEN v_bracket.loser_position = 'home' THEN v_loser_seed ELSE seed_home END,
      seed_away = CASE WHEN v_bracket.loser_position = 'away' THEN v_loser_seed ELSE seed_away END
    WHERE id = v_bracket.loser_next_bracket_id;
  END IF;
END;
$$;
