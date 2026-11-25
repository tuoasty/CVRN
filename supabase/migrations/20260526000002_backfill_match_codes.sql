
WITH ordered AS (
  SELECT m.id,
         m.week,
         ROW_NUMBER() OVER (
           PARTITION BY m.season_id, m.week
           ORDER BY m.scheduled_at NULLS LAST, m.id
         ) AS n
  FROM matches m
  WHERE m.match_code IS NULL
    AND m.match_type = 'season'
    AND m.week IS NOT NULL
)
UPDATE matches m
SET match_code = 'W' || o.week || '-M' || o.n
FROM ordered o
WHERE m.id = o.id;

WITH ordered AS (
  SELECT m.id,
         CASE pb.round
           WHEN 'play_in'      THEN 'pi'
           WHEN 'round_of_16'  THEN 'r16'
           WHEN 'quarterfinal' THEN 'qf'
           WHEN 'semifinal'    THEN 'sf'
           WHEN 'final'        THEN 'gf'
           WHEN 'third_place'  THEN 'tp'
         END AS round_abbrev,
         ROW_NUMBER() OVER (
           PARTITION BY m.season_id, pb.round
           ORDER BY m.scheduled_at NULLS LAST, m.id
         ) AS n
  FROM matches m
  JOIN playoff_brackets pb ON pb.match_id = m.id
  WHERE m.match_code IS NULL
    AND m.match_type = 'playoffs'
)
UPDATE matches m
SET match_code = o.round_abbrev || '-' || o.n
FROM ordered o
WHERE m.id = o.id;
