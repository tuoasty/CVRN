import { createClient } from "@supabase/supabase-js";
import sharp from "sharp";

const url = process.env.SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!url || !key) {
    console.error("SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are required");
    process.exit(1);
}

const supabase = createClient(url, key, { auth: { persistSession: false } });
const PAGE = 100;

async function readDims(imageUrl) {
    const res = await fetch(imageUrl);
    if (!res.ok) return { error: `http ${res.status}` };
    const meta = await sharp(Buffer.from(await res.arrayBuffer())).metadata();
    const width = meta.autoOrient?.width ?? meta.width;
    const height = meta.autoOrient?.height ?? meta.height;
    if (!width || !height) return { error: "no dimensions" };
    return { width, height };
}

let updated = 0;
let skipped = 0;
const seen = new Set();

for (;;) {
    const { data, error } = await supabase
        .from("media_posts")
        .select("id, image_url")
        .not("image_url", "is", null)
        .is("image_width", null)
        .order("created_at", { ascending: true })
        .limit(PAGE);

    if (error) {
        console.error("query failed", error.message);
        process.exit(1);
    }

    const batch = (data ?? []).filter((row) => !seen.has(row.id));
    if (batch.length === 0) break;

    for (const row of batch) {
        seen.add(row.id);
        try {
            const dims = await readDims(row.image_url);
            if ("error" in dims) {
                skipped++;
                console.log(`skip ${row.id} ${dims.error}`);
                continue;
            }
            const { error: updateError } = await supabase
                .from("media_posts")
                .update({ image_width: dims.width, image_height: dims.height })
                .eq("id", row.id);
            if (updateError) {
                skipped++;
                console.log(`skip ${row.id} ${updateError.message}`);
                continue;
            }
            updated++;
            console.log(`ok ${row.id} ${dims.width}x${dims.height}`);
        } catch (err) {
            skipped++;
            console.log(`skip ${row.id} ${err instanceof Error ? err.message : String(err)}`);
        }
    }
}

console.log(`updated ${updated}, skipped ${skipped}`);
