import {DBClient} from "@/shared/types/db";
import {Err, Ok, Result} from "@/shared/types/result";
import {createError} from "@/server/utils/serializeableError";
import {OWNER_DISCORD_ID} from "@/shared/auth/owner";
import type {AccessGroup} from "@/shared/types/accessGroup";
import {findUserAccount} from "@/server/db/userAccounts.repo";
import {deleteUserBlocks, findUserBlocks, insertUserBlocks} from "@/server/db/roleGroups.repo";
import type {SetUserBlocksInput} from "../types";

export async function setUserBlocks(client: DBClient, input: SetUserBlocksInput, actorId: string): Promise<Result<true>> {
    const account = await findUserAccount(client, input.userId);
    if (!account.ok) return account;
    if (!account.value) return Err(createError("Staff account not found", "NOT_FOUND", 404));
    if (account.value.discord_user_id === OWNER_DISCORD_ID) return Err(createError("The owner cannot be blocked", "FORBIDDEN", 403));

    const existing = await findUserBlocks(client, input.userId);
    if (!existing.ok) return existing;

    const desired: (AccessGroup | null)[] =
        input.blocked === "all" ? [null] : input.blocked === null ? [] : [...new Set(input.blocked)];
    const current = existing.value.map(b => b.group_name);

    const toInsert = desired.filter(g => !current.includes(g));
    const toDelete = current.filter(g => !desired.includes(g));

    if (toInsert.length > 0) {
        const inserted = await insertUserBlocks(client, input.userId, toInsert, actorId);
        if (!inserted.ok) return inserted;
    }
    if (toDelete.length > 0) {
        const deleted = await deleteUserBlocks(client, input.userId, toDelete);
        if (!deleted.ok) return deleted;
    }
    return Ok(true);
}
