import {DBClient} from "@/shared/types/db";
import {AddPlayerToTeamInput} from "@/server/dto/player.dto";

export async function upsertPlayer(
    supabase:DBClient,
    p:AddPlayerToTeamInput
){
    return supabase.from("players")
        .upsert(
            {
                roblox_user_id:p.robloxUserId,
                username:p.username,
                display_name:p.displayName ?? null,
                avatar_url:p.avatarUrl ?? null,
                team_id:p.teamId
            },
            {
                onConflict: "roblox_user_id",
            }
        )
        .select()
        .single()
}