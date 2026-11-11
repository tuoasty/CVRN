import {DBClient} from "@/shared/types/db";
import {Ok, Result} from "@/shared/types/result";
import {deleteRoleGroupsExcept, upsertRoleGroups} from "@/server/db/roleGroups.repo";
import type {SetRoleGroupsInput} from "../types";

export async function setRoleGroups(client: DBClient, input: SetRoleGroupsInput, actorId: string): Promise<Result<true>> {
    const groups = [...new Set(input.groups)];

    const removed = await deleteRoleGroupsExcept(client, input.roleId, groups);
    if (!removed.ok) return removed;

    const added = await upsertRoleGroups(client, input.roleId, groups, actorId);
    if (!added.ok) return added;

    return Ok(true);
}
