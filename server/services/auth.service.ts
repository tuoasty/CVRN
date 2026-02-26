import {createError, SerializableError, serializeError} from "@/server/utils/serializeableError";
import {Err, Ok, Result} from "@/shared/types/result";
import {finalizeInvitedUser} from "@/server/services/admin.service";
import {DBClient} from "@/shared/types/db";
import {logger} from "@/server/utils/logger";

export interface AuthUser {
    id: string;
    email: string;
    createdAt: string;
}

export interface AuthResponse {
    user: AuthUser;
    accessToken: string;
}

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
            return Err(serializeError(error));
        }

        if(!data.user || !data.session){
            logger.error({email}, "Sign in succeeded but no user or session returned");
            return Err(createError("Failed to login", "NO_SESSION", 401));
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

export async function setUserPassword(
    supabase: DBClient,
    password:string
):Promise<Result<null, SerializableError>>{
    try {
        const {
            data: {user},
        } = await supabase.auth.getUser();

        if(!user || !user.email){
            logger.error("Attempted to set password without authentication");
            return Err({
                message:"Not authenticated",
                name:"Unauthorized",
            });
        }

        const {error:passwordError} = await supabase.auth.updateUser({
            password,
        });
        if(passwordError){
            logger.error({userId: user.id, error: passwordError}, "Failed to update user password");
            return Err(serializeError(passwordError))
        }

        const finalizeResult = await finalizeInvitedUser(
            user.id, user.email)
        if(!finalizeResult.ok){
            logger.error({userId: user.id, error: finalizeResult.error}, "Failed to finalize invited user");
            return finalizeResult
        }

        return Ok(null)
    } catch (error){
        logger.error({error}, "Unexpected error setting user password");
        return Err(serializeError(error));
    }
}

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

export async function getUserRole(supabase: DBClient, userId:string){
    const {data} = await supabase.from("user_roles").select("role").eq("user_id", userId).single()
    return data?.role || null;
}

export async function getUserWithRole(supabase: DBClient){
    const {data: {user}} = await supabase.auth.getUser();
    if(!user) return null;

    const {data: roleData} = await supabase.from("user_roles").select("*").eq("user_id", user.id).single();
    return {
        user, role: roleData?.role || null, roleData
    };
}

export async function hasRole(supabase: DBClient, userId:string): Promise<boolean>{
    const {data} = await supabase.from("user_roles").select("user_id").eq("user_id", userId).single();
    return !!data
}