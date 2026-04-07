import {SerializableError, serializeError} from "@/server/utils/serializeableError";
import {Err, Ok, Result} from "@/shared/types/result";
import {DBClient} from "@/shared/types/db";
import {logger} from "@/server/utils/logger";

export async function signOut(supabase: DBClient): Promise<Result<void, SerializableError>>{
    try {
        const {error} = await supabase.auth.signOut();
        if(error){
            logger.error({error}, "Failed to sign out");
            return Err(serializeError(error))
        }
        return Ok(undefined)
    } catch (error){
        logger.error({error}, "Unexpected error during sign out");
        return Err(serializeError(error))
    }
}
