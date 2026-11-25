
ALTER TABLE teams DROP CONSTRAINT teams_season_number_unique;
CREATE UNIQUE INDEX teams_season_number_active_unique ON teams (season_id, team_number) WHERE deleted_at IS NULL;
