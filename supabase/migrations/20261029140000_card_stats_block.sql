WITH expanded AS (
    SELECT
        t.id,
        l.value AS layer,
        l.ord,
        (l.value->>'kind' = 'text'
            AND l.value->>'field' IN ('scoring', 'spiking', 'setting', 'blocking', 'receiving', 'serving')) AS is_stat
    FROM "public"."card_templates" t,
         jsonb_array_elements(t.layers) WITH ORDINALITY AS l(value, ord)
),
blocks AS (
    SELECT
        id,
        min(ord) AS ord,
        jsonb_build_object(
            'kind', 'stats',
            'x', min((layer->>'x')::numeric),
            'y', min((layer->>'y')::numeric),
            'w', max((layer->>'x')::numeric + (layer->>'w')::numeric) - min((layer->>'x')::numeric),
            'h', max((layer->>'y')::numeric + (layer->>'h')::numeric) - min((layer->>'y')::numeric),
            'size', max((layer->>'size')::numeric),
            'color', coalesce(min(layer->>'color'), '#ffffff'),
            'letterSpacing', 0
        ) AS layer
    FROM expanded
    WHERE is_stat
    GROUP BY id
),
rebuilt AS (
    SELECT id, jsonb_agg(layer ORDER BY ord) AS layers
    FROM (
        SELECT id, layer, ord FROM expanded WHERE NOT is_stat
        UNION ALL
        SELECT id, layer, ord FROM blocks
    ) merged
    GROUP BY id
)
UPDATE "public"."card_templates" t
SET "layers" = r.layers
FROM rebuilt r
WHERE r.id = t.id
  AND EXISTS (SELECT 1 FROM blocks b WHERE b.id = t.id);
