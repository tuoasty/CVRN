import {DBClient, DiscordBoosterInsert, DiscordBoosterRow} from "@/shared/types/db";
import {Err, Ok, Result} from "@/shared/types/result";
import {serializeError} from "@/server/utils/serializeableError";

const ID_CHUNK = 200;

export async function findAllBoosters(supabase: DBClient): Promise<Result<DiscordBoosterRow[]>> {
    const {data, error} = await supabase
        .from("discord_boosters")
        .select("*");
    if (error) return Err(serializeError(error, "DB_ERROR"));
    return Ok(data ?? []);
}

export async function deleteBoostersByDiscordIds(supabase: DBClient, discordUserIds: string[]): Promise<Result<true>> {
    for (let i = 0; i < discordUserIds.length; i += ID_CHUNK) {
        const {error} = await supabase
            .from("discord_boosters")
            .delete()
            .in("discord_user_id", discordUserIds.slice(i, i + ID_CHUNK));
        if (error) return Err(serializeError(error, "DB_ERROR"));
    }
    return Ok(true);
}

export async function upsertBoosters(supabase: DBClient, rows: DiscordBoosterInsert[]): Promise<Result<true>> {
    if (rows.length === 0) return Ok(true);
    const {error} = await supabase
        .from("discord_boosters")
        .upsert(rows, {onConflict: "discord_user_id"});
    if (error) return Err(serializeError(error, "DB_ERROR"));
    return Ok(true);
}
