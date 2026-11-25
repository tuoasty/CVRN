
UPDATE matches
SET match_code = regexp_replace(match_code, '^W(\d+)-M(\d+)$', '\1-\2')
WHERE match_code ~ '^W\d+-M\d+$';
