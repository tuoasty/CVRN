import {createError, SerializableError, serializeError} from "@/server/utils/serializeableError";
import {createClient} from "@/server/supabase/server";
import {Err, Ok, Result} from "@/shared/types/result";
import {finalizeInvitedUser} from "@/server/services/admin.service";

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
    email:string,
    password:string
): Promise<Result<AuthResponse, SerializableError>>{
    try {
        const supabase = await createClient();

        const {data, error} = await supabase.auth.signInWithPassword({
            email,
            password,
        });

        if(error){
            return Err(serializeError(error));
        }

        if(!data.user || !data.session){
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
        return Err(serializeError(error))
    }
}

export async function signOut(): Promise<Result<void, SerializableError>>{
    try {
        const supabase = await createClient();
        const {error} = await supabase.auth.signOut();
        if(error){
            return Err(serializeError(error))
        }
        return Ok(undefined)
    } catch (error){
        return Err(serializeError(error))
    }
}

export async function setUserPassword(
    password:string
):Promise<Result<null, SerializableError>>{
    try {
        const supabase = await createClient()

        const {
            data: {user},
        } = await supabase.auth.getUser();

        if(!user || !user.email){
            return Err({
                message:"Not authenticated",
                name:"Unauthorized",
            });
        }

        const {error:passwordError} = await supabase.auth.updateUser({
            password,
        });
        if(passwordError){
            return Err(serializeError(passwordError))
        }

        const finalizeResult = await finalizeInvitedUser(
            user.id, user.email)
        if(!finalizeResult.ok){
            return finalizeResult
        }

        return Ok(null)
    } catch (error){
        return Err(serializeError(error));
    }
}

export async function processAuthCallback(
    url:string
): Promise<Result<null, SerializableError>>{
    try {
        const supabase = await createClient()
        const hash = url.split("#")[1];

        if(!hash){
            return Err({
                message:"Missing auth tokens",
                name:"AuthError"
            });
        }
        const params = new URLSearchParams(hash)
        const access_token = params.get("access_token")
        const refresh_token = params.get("refresh_token")

        if(!access_token || !refresh_token){
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
            return Err(serializeError(error))
        }

        if(!data.session){
            return Err({
                message:"Session creation failed",
                name:"AuthError"
            })
        }
        return Ok(null)
    } catch (error) {
        return Err(serializeError(error))
    }
}