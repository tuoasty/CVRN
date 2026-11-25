CREATE OR REPLACE FUNCTION reapply_match_result(
  p_match_id            uuid,
  p_sets                jsonb,
  p_home_sets_won       int,
  p_away_sets_won       int,
  p_home_lvr            numeric DEFAULT NULL,
  p_away_lvr            numeric DEFAULT NULL,
  p_home_points         numeric DEFAULT NULL,
  p_away_points         numeric DEFAULT NULL,
  p_home_bonus          numeric DEFAULT NULL,
  p_away_bonus          numeric DEFAULT NULL,
  p_point_diff          numeric DEFAULT NULL,
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
    home_team_points     = p_home_points,
    away_team_points     = p_away_points,
    home_team_bonus      = p_home_bonus,
    away_team_bonus      = p_away_bonus,
    point_diff           = p_point_diff,
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
        home_team_points    = NULL,
        away_team_points    = NULL,
        home_team_bonus     = NULL,
        away_team_bonus     = NULL,
        point_diff          = NULL,
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
      home_team_points    = NULL,
      away_team_points    = NULL,
      home_team_bonus     = NULL,
      away_team_bonus     = NULL,
      point_diff          = NULL,
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
    home_team_points    = NULL,
    away_team_points    = NULL,
    home_team_bonus     = NULL,
    away_team_bonus     = NULL,
    point_diff          = NULL,
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

CREATE OR REPLACE FUNCTION readvance_playoff_match(p_match_id uuid)
RETURNS matches
LANGUAGE plpgsql
AS $$
DECLARE
  v_match matches%ROWTYPE;
BEGIN
  SELECT * INTO v_match FROM matches WHERE id = p_match_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'match not found';
  END IF;

  IF v_match.match_type <> 'playoffs'
     OR v_match.status <> 'completed'
     OR v_match.home_team_id IS NULL
     OR v_match.away_team_id IS NULL THEN
    RAISE EXCEPTION 'match is not a completed playoff match with both teams';
  END IF;

  PERFORM advance_playoff_winner(p_match_id);

  SELECT * INTO v_match FROM matches WHERE id = p_match_id;
  RETURN v_match;
END;
$$;
