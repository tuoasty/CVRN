import {DBClient} from "@/shared/types/db";
import {GetTeamPlayers, SavePlayerInput, UpdatePlayerInput} from "@/server/dto/player.dto";

export async function upsertPlayer(
    supabase:DBClient,
    p:SavePlayerInput
){
    return supabase.from("players")
        .upsert(
            {
                roblox_user_id:p.robloxUserId,
                username:p.username,
                display_name:p.displayName ?? null,
                avatar_url:p.avatarUrl ?? null,
                team_id:p.teamId,
                last_synced_at: new Date().toISOString()
            },
            {
                onConflict: "roblox_user_id",
            }
        )
        .select()
        .single()
}

export async function findAllTeamPlayers(
    supabase:DBClient,
    p:GetTeamPlayers
) {
    return supabase.from("players")
        .select("*")
        .eq("team_id", p.teamId)
}

export async function updatePlayer(
    supabase:DBClient,
    p:UpdatePlayerInput
) {
    return supabase
        .from("players")
        .update({
            username: p.user.name,
            display_name: p.user.displayName,
            avatar_url: p.avatarUrl,
            last_synced_at: new Date().toISOString(),
        })
        .eq("roblox_user_id", p.user.id.toString())
        .select()
        .single();
}