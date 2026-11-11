import {DBClient} from "@/shared/types/db";
import {Err, Ok, Result} from "@/shared/types/result";
import {createError} from "@/server/utils/serializeableError";
import {AccessGroup} from "@/shared/types/accessGroup";
import {getCurrentGroups} from "./getCurrentGroups";

export async function requireGroups(
    supabase: DBClient,
    allowed: readonly AccessGroup[]
): Promise<Result<{userId: string; groups: AccessGroup[]}>> {
    const {data: {user}} = await supabase.auth.getUser();
    if (!user) return Err(createError("Unauthorized", "UNAUTHORIZED", 401));

    const groupsResult = await getCurrentGroups(supabase);
    if (!groupsResult.ok) return groupsResult;
    const groups = groupsResult.value;

    if (!groups.includes("super_admin") && !allowed.some(g => groups.includes(g))) {
        return Err(createError("Forbidden", "FORBIDDEN", 403));
    }

    return Ok({userId: user.id, groups});
}
