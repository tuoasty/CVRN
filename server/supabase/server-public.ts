// lib/supabase/server-public.ts
import { createServerClient } from "@supabase/ssr";
import {Database} from "@/shared/types/db.override";

export function createPublicClient() {
    return createServerClient<Database>(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
        {
            cookies: {
                getAll() {
                    return [];
                },
                setAll() {
                    // No-op
                },
            },
        },
    );
}