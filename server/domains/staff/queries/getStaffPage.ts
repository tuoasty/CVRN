import "server-only";
import {DBClient} from "@/shared/types/db";
import {Ok, Result} from "@/shared/types/result";
import {listGuildRoles} from "@/server/discord/client";
import {findAllUserAccounts} from "@/server/db/userAccounts.repo";
import {findAllRoleGroups, findAllUserBlocks} from "@/server/db/roleGroups.repo";
import {buildStaffPage} from "../helpers/buildStaffPage";
import type {StaffPage} from "../types";

export async function getStaffPage(client: DBClient): Promise<Result<StaffPage>> {
    const [discordRoles, mappings, accounts, blocks] = await Promise.all([
        listGuildRoles(),
        findAllRoleGroups(client),
        findAllUserAccounts(client),
        findAllUserBlocks(client),
    ]);
    if (!discordRoles.ok) return discordRoles;
    if (!mappings.ok) return mappings;
    if (!accounts.ok) return accounts;
    if (!blocks.ok) return blocks;

    return Ok(buildStaffPage({
        discordRoles: discordRoles.value,
        mappings: mappings.value,
        accounts: accounts.value,
        blocks: blocks.value,
    }));
}
