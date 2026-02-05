import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import type {Database} from "@/database.types";

/**
 * Especially important if using Fluid compute: Don't put this client in a
 * global variable. Always create a new client within each function when using
 * it.
 */
export async function createClient() {
  const cookieStore = await cookies();

  return createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options),
            );
          } catch {
            // The `setAll` method was called from a Server Component.
            // This can be ignored if you have proxy refreshing
            // user sessions.
          }
        },
      },
    },
  );
}

export async function getUserRole(userId:string){
  const supabase = await createClient();
  const {data} = await supabase.from("user_roles").select("role").eq("user_id", userId).single()
  return data?.role || null;
}

export async function getUserWithRole(){
  const supabase = await createClient();
  const {data: {user}} = await supabase.auth.getUser();
  if(!user) return null;

  const {data: roleData} = await supabase.from("user_roles").select("*").eq("user_id", user.id).single();
  return {
    user, role: roleData?.role || null, roleData
  };
}

export async function hasRole(userId:string): Promise<boolean>{
  const supabase = await createClient();
  const {data} = await supabase.from("user_roles").select("user_id").eq("user_id", userId).single();
  return !!data
}