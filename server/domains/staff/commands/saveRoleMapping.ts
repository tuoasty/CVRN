import {DBClient} from "@/shared/types/db";
import {Err, Ok, Result} from "@/shared/types/result";
import {setRoleGroups} from "./setRoleGroups";
import type {SaveRoleMappingInput} from "../types";

export async function saveRoleMapping(client: DBClient, input: SaveRoleMappingInput, actorId: string): Promise<Result<true>> {
    for (const change of input.changes) {
        const saved = await setRoleGroups(client, change, actorId);
        if (!saved.ok) {
            return Err({...saved.error, message: `Role ${change.roleId}: ${saved.error.message}`});
        }
    }
    return Ok(true);
}
