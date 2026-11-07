import "server-only";
import axios, {AxiosError} from "axios";
import {Err, Ok, Result} from "@/shared/types/result";
import {createError} from "@/server/utils/serializeableError";
import {logger} from "@/server/utils/logger";

const log = logger.child({module: "booster/bloxlink"});

const bloxlinkApi = axios.create({
    baseURL: "https://api.blox.link/v4/public",
    timeout: 8000,
});

function extractRobloxId(data: unknown): string | null {
    if (typeof data !== "object" || data === null) return null;
    const body = data as Record<string, unknown>;
    const raw = body.robloxID ?? body.robloxId;
    if (typeof raw === "string" && raw.length > 0) return raw;
    if (typeof raw === "number") return String(raw);
    return null;
}

export async function resolveRobloxIdFromDiscord(discordUserId: string): Promise<Result<string | null>> {
    const apiKey = process.env.BLOXLINK_API_KEY;
    const guildId = process.env.DISCORD_GUILD_ID;
    if (!apiKey || !guildId) {
        return Err(createError("Missing BLOXLINK_API_KEY or DISCORD_GUILD_ID", "INTEGRATION_ERROR"));
    }

    try {
        const {data} = await bloxlinkApi.get(`/guilds/${guildId}/discord-to-roblox/${discordUserId}`, {
            headers: {Authorization: apiKey},
        });
        const robloxId = extractRobloxId(data);
        if (!robloxId) {
            log.error({discordUserId, body: data}, "Bloxlink returned 200 without a Roblox id");
            return Err(createError("Unexpected Bloxlink response shape", "INTEGRATION_ERROR"));
        }
        return Ok(robloxId);
    } catch (error) {
        if (error instanceof AxiosError && error.response?.status === 404) return Ok(null);
        const status = error instanceof AxiosError ? error.response?.status : undefined;
        const body = error instanceof AxiosError ? error.response?.data : undefined;
        log.warn({discordUserId, status, body}, "Bloxlink lookup failed");
        return Err(createError(`Bloxlink ${status ?? "network"} error`, "INTEGRATION_ERROR", status));
    }
}
