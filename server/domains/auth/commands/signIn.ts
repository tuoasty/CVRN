import {createError, SerializableError, serializeError} from "@/server/utils/serializeableError";
import {Err, Ok, Result} from "@/shared/types/result";
import {DBClient} from "@/shared/types/db";
import {logger} from "@/server/utils/logger";
import {AuthResponse} from "../types";

export async function signIn(
    supabase: DBClient,
    email:string,
    password:string
): Promise<Result<AuthResponse, SerializableError>>{
    try {
        const {data, error} = await supabase.auth.signInWithPassword({
            email,
            password,
        });

        if(error){
            logger.error({email, error}, "Failed to sign in");
            return Err(serializeError(error, "UNAUTHORIZED"));
        }

        if(!data.user || !data.session){
            logger.error({email}, "Sign in succeeded but no user or session returned");
            return Err(createError("Failed to login", "UNAUTHORIZED", 401));
        }

        return Ok({
            user: {
                id: data.user.id,
                email: data.user.email!,
                createdAt: data.user.created_at,
            },
            accessToken: data.session.access_token,
        });
    } catch (error){
        logger.error({error}, "Unexpected error during sign in");
        return Err(serializeError(error))
    }
}
