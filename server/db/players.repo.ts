import {DBClient} from "@/shared/types/db";
import {SavePlayerInput, UpdatePlayerInput} from "@/server/dto/player.dto";

export async function upsertPlayer(
    supabase:DBClient,
    p:SavePlayerInput
){
    return supabase.from("players")
        .upsert(
            {
                roblox_user_id:String(p.robloxUserId),
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

export async function findPlayerByRobloxId(
    supabase:DBClient,
    robloxUserId:string
) {
    return supabase.from("players")
        .select("*")
        .eq("roblox_user_id", robloxUserId).maybeSingle()
}

export async function findAllTeamPlayers(
    supabase:DBClient,
    teamId:string
) {
    return supabase.from("players")
        .select("*")
        .eq("team_id", teamId)
}

export async function removeAllPlayersFromTeam(supabase: DBClient, teamId:string){
    return supabase.from("players")
        .update({team_id: null}).eq("team_id", teamId)
}

export async function updatePlayer(supabase: DBClient, p: UpdatePlayerInput) {
    const updates: Record<string, unknown> = {}

    if (p.username !== undefined) updates.username = p.username
    if (p.displayName !== undefined) updates.display_name = p.displayName
    if (p.avatarUrl !== undefined) updates.avatar_url = p.avatarUrl
    if (p.lastSyncedAt !== undefined) updates.last_synced_at = p.lastSyncedAt
    if (p.teamId !== undefined) updates.team_id = p.teamId

    return supabase
        .from("players")
        .update(updates)
        .eq("roblox_user_id", p.robloxUserId)
        .select()
        .single()
}