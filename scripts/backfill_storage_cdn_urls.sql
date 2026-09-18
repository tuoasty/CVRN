UPDATE public.teams
SET logo_url = replace(logo_url, 'https://tklvaiurgmvqnsspocsm.supabase.co', 'https://cdn.cvrn.net')
WHERE logo_url LIKE 'https://tklvaiurgmvqnsspocsm.supabase.co/%';

UPDATE public.media_posts
SET image_url = replace(image_url, 'https://tklvaiurgmvqnsspocsm.supabase.co', 'https://cdn.cvrn.net')
WHERE image_url LIKE 'https://tklvaiurgmvqnsspocsm.supabase.co/%';

UPDATE public.season_awards
SET full_avatar_url = replace(full_avatar_url, 'https://tklvaiurgmvqnsspocsm.supabase.co', 'https://cdn.cvrn.net')
WHERE full_avatar_url LIKE 'https://tklvaiurgmvqnsspocsm.supabase.co/%';
