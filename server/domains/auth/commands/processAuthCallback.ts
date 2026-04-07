import {SerializableError, serializeError} from "@/server/utils/serializeableError";
import {Err, Ok, Result} from "@/shared/types/result";
import {DBClient} from "@/shared/types/db";
import {logger} from "@/server/utils/logger";

export async function processAuthCallback(
    supabase: DBClient,
    url:string
): Promise<Result<null, SerializableError>>{
    try {
        const hash = url.split("#")[1];

        if(!hash){
            logger.error({url}, "Missing hash in auth callback URL");
            return Err({
                message:"Missing auth tokens",
                name:"AuthError"
            });
        }
        const params = new URLSearchParams(hash)
        const access_token = params.get("access_token")
        const refresh_token = params.get("refresh_token")

        if(!access_token || !refresh_token){
            logger.error("Missing access_token or refresh_token in auth callback");
            return Err({
                message:"Invalid auth callback",
                name:"AuthError"
            })
        }

        const { data, error} = await supabase.auth.setSession({
            access_token,
            refresh_token
        });

        if (error) {
            logger.error({error}, "Failed to set session from auth callback");
            return Err(serializeError(error))
        }

        if(!data.session){
            logger.error("Session creation failed in auth callback");
            return Err({
                message:"Session creation failed",
                name:"AuthError"
            })
        }
        return Ok(null)
    } catch (error) {
        logger.error({error}, "Unexpected error processing auth callback");
        return Err(serializeError(error))
    }
}
