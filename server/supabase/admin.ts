import {createClient, SupabaseClient} from "@supabase/supabase-js";

let client: SupabaseClient | null = null;

// Lazy so `next build` doesn't require SUPABASE_SERVICE_ROLE_KEY. Asserted at boot in instrumentation.ts.
export function getSupabaseAdmin() {
    if (client) return client;

    const url = process.env.SUPABASE_URL;
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!url) throw new Error("Missing SUPABASE_URL");
    if (!serviceRoleKey) throw new Error("Missing SUPABASE_SERVICE_ROLE_KEY");

    client = createClient(url, serviceRoleKey, {
        auth: {
            autoRefreshToken: false,
            persistSession: false,
        }
    });

    return client;
}
