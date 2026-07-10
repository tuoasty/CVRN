import {DBClient} from "@/shared/types/db";
import {Err, Ok, Result} from "@/shared/types/result";
import {createError} from "@/server/utils/serializeableError";
import {getUserRole} from "@/server/db/roles.repo";

/**
 * Guard for batch-destructive actions. Resolves to the caller's userId only when
 * they are a super_admin; otherwise returns an early-returnable Err.
 *
 *   const guard = await requireSuperAdmin(supabase);
 *   if (!guard.ok) return guard;
 */
export async function requireSuperAdmin(supabase: DBClient): Promise<Result<string>> {
    const {data: {user}} = await supabase.auth.getUser();
    if (!user) return Err(createError("Unauthorized", "UNAUTHORIZED", 401));

    const roleResult = await getUserRole(supabase, user.id);
    if (!roleResult.ok) return roleResult;

    if (roleResult.value !== "super_admin") {
        return Err(createError("Forbidden", "FORBIDDEN", 403));
    }

    return Ok(user.id);
}
