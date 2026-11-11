import {DBClient} from "@/shared/types/db";
import {Err, Ok, Result} from "@/shared/types/result";
import {createError} from "@/server/utils/serializeableError";
import {AccessGroup} from "@/shared/types/accessGroup";
import {recordAudit} from "@/server/domains/audit";
import {getCurrentGroups} from "./getCurrentGroups";

export type GuardAudit = {action: string; target?: unknown};

export async function requireGroups(
    supabase: DBClient,
    allowed: readonly AccessGroup[],
    audit?: GuardAudit
): Promise<Result<{userId: string; groups: AccessGroup[]}>> {
    const {data: {user}} = await supabase.auth.getUser();
    if (!user) return Err(createError("Unauthorized", "UNAUTHORIZED", 401));

    const groupsResult = await getCurrentGroups(supabase);
    if (!groupsResult.ok) return groupsResult;
    const groups = groupsResult.value;

    const passed = groups.includes("super_admin") || allowed.some(g => groups.includes(g));

    if (audit && groups.length > 0) {
        recordAudit({
            userId: user.id,
            groups,
            action: audit.action,
            outcome: passed ? "allowed" : "denied",
            target: audit.target,
        });
    }

    if (!passed) return Err(createError("Forbidden", "FORBIDDEN", 403));

    return Ok({userId: user.id, groups});
}
