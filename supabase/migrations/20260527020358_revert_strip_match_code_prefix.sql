
UPDATE matches
SET match_code = 'W' || split_part(match_code, '-', 1) || '-M' || split_part(match_code, '-', 2)
WHERE match_code ~ '^\d+-\d+$';
