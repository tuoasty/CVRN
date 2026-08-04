import {DBClient} from "@/shared/types/db";
import {Result} from "@/shared/types/result";
import {requireRoles} from "@/server/domains/auth/queries/requireRoles";

export async function requireAdmin(supabase: DBClient): Promise<Result<string>> {
    return requireRoles(supabase, ["admin", "super_admin"]);
}
