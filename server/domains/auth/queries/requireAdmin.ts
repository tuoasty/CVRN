import {DBClient} from "@/shared/types/db";
import {Err, Ok, Result} from "@/shared/types/result";
import {createError} from "@/server/utils/serializeableError";
import {getUserRole} from "@/server/db/roles.repo";

/**
 * Guard for actions that any league admin may perform. Resolves to the caller's userId
 * only when they are an `admin` or `super_admin`; otherwise returns an early-returnable Err.
 *
 *   const guard = await requireAdmin(supabase);
 *   if (!guard.ok) return guard;
 *
 * Use this rather than a bare `supabase.auth.getUser()` check whenever an action has a real
 * cost or effect. "Is logged in" is not an authorization decision here: `stat_tracker` and
 * `staff` are authenticated, and so is any user who accepted an invite without a
 * `user_roles` row. Server actions are RPC endpoints — hiding a button in the nav does not
 * stop any of them from calling it.
 *
 * For batch-destructive actions, use `requireSuperAdmin` instead.
 */
export async function requireAdmin(supabase: DBClient): Promise<Result<string>> {
    const {data: {user}} = await supabase.auth.getUser();
    if (!user) return Err(createError("Unauthorized", "UNAUTHORIZED", 401));

    const roleResult = await getUserRole(supabase, user.id);
    if (!roleResult.ok) return roleResult;

    if (roleResult.value !== "admin" && roleResult.value !== "super_admin") {
        return Err(createError("Forbidden", "FORBIDDEN", 403));
    }

    return Ok(user.id);
}
