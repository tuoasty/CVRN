-- Make nullable arguments on the match RPCs explicit (DEFAULT NULL).
-- Generated TS types from non-default numeric/uuid/timestamptz args become non-nullable;
-- in practice LVR is null on playoff matches, MVP is optional, scheduled_at is optional.
-- Adding DEFAULTs lets supabase gen types emit `param?: type | null` so callers can pass null.
-- Postgres requires every arg after the first DEFAULT to also have a default, hence
-- p_is_forfeit gets DEFAULT false (callers always pass a value explicitly).

CREATE OR REPLACE FUNCTION complete_match(
  p_match_id            uuid,
  p_sets                jsonb,
  p_home_sets_won       int,
  p_away_sets_won       int,
  p_home_lvr            numeric     DEFAULT NULL,
  p_away_lvr            numeric     DEFAULT NULL,
  p_mvp_player_id       uuid        DEFAULT NULL,
  p_loser_mvp_player_id uuid        DEFAULT NULL,
  p_is_forfeit          bool        DEFAULT false,
  p_scheduled_at        timestamptz DEFAULT NULL
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
