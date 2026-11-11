import {SerializableError, serializeError} from "@/server/utils/serializeableError";
import {Err, Ok, Result} from "@/shared/types/result";
import {DBClient} from "@/shared/types/db";
import {logger} from "@/server/utils/logger";
import {recordAudit} from "@/server/domains/audit";
import {getCurrentGroups} from "../queries/getCurrentGroups";

async function recordSignOut(supabase: DBClient): Promise<void> {
    const {data: {user}} = await supabase.auth.getUser();
    if (!user) return;
    const groups = await getCurrentGroups(supabase);
    if (!groups.ok || groups.value.length === 0) return;
    recordAudit({kind: "auth", userId: user.id, groups: groups.value, action: "signOut", outcome: "allowed"});
}

export async function signOut(supabase: DBClient): Promise<Result<void, SerializableError>>{
    try {
        await recordSignOut(supabase).catch(error => logger.error({error}, "Sign-out audit failed"));
        const {error} = await supabase.auth.signOut();
        if(error){
            logger.error({error}, "Failed to sign out");
            return Err(serializeError(error, "UNAUTHORIZED"))
        }
        return Ok(undefined)
    } catch (error){
        logger.error({error}, "Unexpected error during sign out");
        return Err(serializeError(error))
    }
}
