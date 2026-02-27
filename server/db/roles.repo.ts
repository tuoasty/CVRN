import { DBClient } from "@/shared/types/db";
import { Err, Ok, Result } from "@/shared/types/result";
import { serializeError } from "@/server/utils/serializeableError";
import { logger } from "@/server/utils/logger";

type UserRole = 'admin' | 'super_admin' | null;

const roleCache = new Map<string, { role: UserRole; cachedAt: number }>();
const ROLE_CACHE_TTL_MS = 5 * 60 * 1000;

export async function getUserRole(supabase: DBClient, userId: string): Promise<Result<UserRole>> {
    try {
        const cached = roleCache.get(userId);
        const now = Date.now();

        if (cached && now - cached.cachedAt < ROLE_CACHE_TTL_MS) {
            return Ok(cached.role);
        }

        const { data, error } = await supabase
            .from('user_roles')
            .select('role')
            .eq('user_id', userId)
            .single();

        if (error) {
            if (error.code === 'PGRST116') {
                roleCache.set(userId, { role: null, cachedAt: now });
                return Ok(null);
            }
            logger.error({ userId, error }, "Failed to fetch user role");
            return Err(serializeError(error));
        }

        const role = data.role as UserRole;
        roleCache.set(userId, { role, cachedAt: now });

        return Ok(role);
    } catch (error) {
        logger.error({ userId, error }, "Unexpected error fetching user role");
        return Err(serializeError(error));
    }
}

export function clearUserRoleCache(userId?: string): void {
    if (userId) {
        roleCache.delete(userId);
    } else {
        roleCache.clear();
    }
}