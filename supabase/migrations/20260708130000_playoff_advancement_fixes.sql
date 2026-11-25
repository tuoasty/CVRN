
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

  v_next_match matches%ROWTYPE;
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

  IF v_bracket.round = 'grand_final' AND v_match.home_sets_won > v_match.away_sets_won THEN RETURN; END IF;

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

    SELECT * into v_next_match FROM matches WHERE id = v_next_match_id;
    IF v_next_match.status = 'completed'
     AND v_next_match.home_team_id IS NOT NULL 
     AND v_next_match.away_team_id IS NOT NULL 
     THEN PERFORM advance_playoff_winner(v_next_match_id); END IF;
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

    SELECT * into v_next_match FROM matches WHERE id = v_next_match_id;
    IF v_next_match.status = 'completed'
     AND v_next_match.home_team_id IS NOT NULL 
     AND v_next_match.away_team_id IS NOT NULL 
     THEN PERFORM advance_playoff_winner(v_next_match_id); END IF;
  END IF;
END;
$$;

CREATE OR REPLACE FUNCTION void_match(p_match_id uuid)
RETURNS matches
LANGUAGE plpgsql
AS $$
DECLARE
  v_start_bracket playoff_brackets%ROWTYPE;
  v_match         matches%ROWTYPE;
  v_season_id     uuid;
  r               record;
BEGIN

  DELETE FROM match_sets      WHERE match_id = p_match_id;
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

    DELETE FROM match_sets      WHERE match_id IN (SELECT match_id FROM _downstream);
    DELETE FROM match_officials WHERE match_id IN (SELECT match_id FROM _downstream);

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

  IF v_start_bracket.id IS NOT NULL THEN
    SELECT season_id INTO v_season_id FROM matches WHERE id = p_match_id;

    FOR r IN
      SELECT pb.match_id
      FROM playoff_brackets pb
      JOIN matches m ON m.id = pb.match_id
      WHERE pb.season_id = v_season_id
        AND m.status = 'completed'
        AND m.home_team_id IS NOT NULL
        AND m.away_team_id IS NOT NULL
      ORDER BY pb.display_order
    LOOP
      PERFORM advance_playoff_winner(r.match_id);
    END LOOP;
  END IF;

  SELECT * INTO v_match FROM matches WHERE id = p_match_id;
  RETURN v_match;
END;
$$;

CREATE OR REPLACE FUNCTION reapply_match_result(
  p_match_id            uuid,
  p_sets                jsonb,
  p_home_sets_won       int,
  p_away_sets_won       int,
  p_home_lvr            numeric DEFAULT NULL,
  p_away_lvr            numeric DEFAULT NULL,
  p_mvp_player_id       uuid    DEFAULT NULL,
  p_loser_mvp_player_id uuid    DEFAULT NULL,
  p_is_forfeit          bool    DEFAULT false
)
RETURNS matches
LANGUAGE plpgsql
AS $$
DECLARE
  v_start_bracket playoff_brackets%ROWTYPE;
  v_match         matches%ROWTYPE;
  v_season_id     uuid;
  v_old_home_won  boolean;
  v_new_home_won  boolean;
  r               record;
BEGIN

  SELECT (home_sets_won > away_sets_won) INTO v_old_home_won
  FROM matches WHERE id = p_match_id;

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

  v_new_home_won := (p_home_sets_won > p_away_sets_won);

  SELECT * INTO v_start_bracket FROM playoff_brackets WHERE match_id = p_match_id;

  IF FOUND THEN
    IF v_old_home_won IS DISTINCT FROM v_new_home_won THEN

      SELECT season_id INTO v_season_id FROM matches WHERE id = p_match_id;

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

      DELETE FROM match_sets      WHERE match_id IN (SELECT match_id FROM _downstream);
      DELETE FROM match_officials WHERE match_id IN (SELECT match_id FROM _downstream);

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

      FOR r IN
        SELECT pb.match_id
        FROM playoff_brackets pb
        JOIN matches m ON m.id = pb.match_id
        WHERE pb.season_id = v_season_id
          AND m.status = 'completed'
          AND m.home_team_id IS NOT NULL
          AND m.away_team_id IS NOT NULL
        ORDER BY pb.display_order
      LOOP
        PERFORM advance_playoff_winner(r.match_id);
      END LOOP;
    ELSE

      PERFORM advance_playoff_winner(p_match_id);
    END IF;
  END IF;

  SELECT * INTO v_match FROM matches WHERE id = p_match_id;
  RETURN v_match;
END;
$$;
