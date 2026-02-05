import {createError, SerializableError, serializeError} from "@/server/error/serializeableError";
import {createClient} from "@/server/supabase/server";
import {Err, Ok, Result} from "@/shared/types/result";
import {supabaseAdmin} from "@/server/supabase/admin";

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

export async function inviteUser(
    email:string,
    role:"admin" | "super_admin" | "stat_tracker",
    invitedBy: string
): Promise<Result<null, SerializableError>> {
    try {
        const { error: inviteError} = await supabaseAdmin.auth.admin.inviteUserByEmail(email);
        if(inviteError){
            return Err(serializeError(inviteError))
        }

        const {error:dbError} = await supabaseAdmin.from("pending_users").insert({
            email, role, invitedBy:invitedBy,
        });
        if(dbError){
            return Err(serializeError(dbError))
        }
        return Ok(null)
    } catch(error){
        return Err(serializeError(error))
    }
}