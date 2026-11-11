import "server-only";
import axios, {AxiosError} from "axios";
import axiosRetry, {exponentialDelay} from "axios-retry";
import {Err, Ok, Result} from "@/shared/types/result";
import {createError} from "@/server/utils/serializeableError";
import {logger} from "@/server/utils/logger";
import {GuildBooster} from "@/server/domains/booster/types";

const log = logger.child({module: "discord"});

const PAGE_SIZE = 1000;

export const discordApi = axios.create({
    baseURL: "https://discord.com/api/v10",
    timeout: 10000,
});

axiosRetry(discordApi, {
    retries: 3,
    retryDelay: (retryCount, error) => {
        const retryAfter = Number(error.response?.headers?.["retry-after"]);
        return Number.isFinite(retryAfter) && retryAfter > 0 ? retryAfter * 1000 : exponentialDelay(retryCount);
    },
    retryCondition: (error: AxiosError) => {
        if (!error.response) return true;
        const status = error.response.status;
        return status === 429 || status >= 500;
    },
    shouldResetTimeout: true,
});

interface DiscordMember {
    user?: {id: string};
    roles: string[];
    premium_since?: string | null;
}

interface DiscordRole {
    id: string;
    name?: string;
    position?: number;
    managed?: boolean;
    tags?: {premium_subscriber?: null};
}

export interface GuildRole {
    id: string;
    name: string;
    position: number;
    managed: boolean;
}

function authHeaders(token: string) {
    return {Authorization: `Bot ${token}`};
}

function describeError(error: unknown): string {
    if (error instanceof AxiosError) {
        const body = error.response?.data ? JSON.stringify(error.response.data) : "";
        return `Discord ${error.response?.status ?? "network"} ${body}`.trim();
    }
    return error instanceof Error ? error.message : String(error);
}

async function resolveBoosterRoleId(guildId: string, token: string): Promise<Result<string>> {
    const configured = process.env.DISCORD_BOOSTER_ROLE_ID;
    if (configured) return Ok(configured);

    try {
        const {data} = await discordApi.get<DiscordRole[]>(`/guilds/${guildId}/roles`, {headers: authHeaders(token)});
        const role = data.find((r) => r.tags !== undefined && "premium_subscriber" in r.tags);
        if (!role) return Err(createError("Guild has no Booster role", "INTEGRATION_ERROR"));
        return Ok(role.id);
    } catch (error) {
        log.error({error: describeError(error)}, "Failed to fetch guild roles");
        return Err(createError(describeError(error), "INTEGRATION_ERROR"));
    }
}

export async function listGuildBoosters(): Promise<Result<GuildBooster[]>> {
    const token = process.env.DISCORD_TOKEN;
    const guildId = process.env.DISCORD_GUILD_ID;
    if (!token || !guildId) {
        return Err(createError("Missing DISCORD_TOKEN or DISCORD_GUILD_ID", "INTEGRATION_ERROR"));
    }

    const roleRes = await resolveBoosterRoleId(guildId, token);
    if (!roleRes.ok) return roleRes;
    const boosterRoleId = roleRes.value;

    const boosters: GuildBooster[] = [];
    let after = "0";
    let pages = 0;

    try {
        while (true) {
            const {data} = await discordApi.get<DiscordMember[]>(`/guilds/${guildId}/members`, {
                headers: authHeaders(token),
                params: {limit: PAGE_SIZE, after},
            });
            pages++;

            for (const member of data) {
                if (!member.user) continue;
                if (!member.roles.includes(boosterRoleId)) continue;
                boosters.push({discordUserId: member.user.id, premiumSince: member.premium_since ?? null});
            }

            const last = data[data.length - 1]?.user?.id;
            if (data.length < PAGE_SIZE || !last) break;
            after = last;
        }
    } catch (error) {
        log.error({error: describeError(error), pages}, "Failed to list guild members");
        return Err(createError(describeError(error), "INTEGRATION_ERROR"));
    }

    log.info({pages, boosters: boosters.length}, "Listed guild boosters");
    return Ok(boosters);
}

function credentials(): Result<{token: string; guildId: string}> {
    const token = process.env.DISCORD_TOKEN;
    const guildId = process.env.DISCORD_GUILD_ID;
    if (!token || !guildId) {
        return Err(createError("Missing DISCORD_TOKEN or DISCORD_GUILD_ID", "INTEGRATION_ERROR"));
    }
    return Ok({token, guildId});
}

export async function getGuildMember(discordUserId: string): Promise<Result<{roles: string[]} | null>> {
    const creds = credentials();
    if (!creds.ok) return creds;
    const {token, guildId} = creds.value;

    try {
        const {data} = await discordApi.get<DiscordMember>(`/guilds/${guildId}/members/${discordUserId}`, {
            headers: authHeaders(token),
        });
        return Ok({roles: data.roles});
    } catch (error) {
        const code = error instanceof AxiosError ? (error.response?.data as {code?: number} | undefined)?.code : undefined;
        if (code === 10007 || code === 10013) {
            return Ok(null);
        }
        log.error({error: describeError(error), discordUserId}, "Failed to fetch guild member");
        return Err(createError(describeError(error), "INTEGRATION_ERROR"));
    }
}

export async function listGuildRoles(): Promise<Result<GuildRole[]>> {
    const creds = credentials();
    if (!creds.ok) return creds;
    const {token, guildId} = creds.value;

    try {
        const {data} = await discordApi.get<DiscordRole[]>(`/guilds/${guildId}/roles`, {headers: authHeaders(token)});
        const roles = data
            .filter(r => r.id !== guildId)
            .map(r => ({id: r.id, name: r.name ?? r.id, position: r.position ?? 0, managed: r.managed ?? false}))
            .sort((a, b) => b.position - a.position);
        return Ok(roles);
    } catch (error) {
        log.error({error: describeError(error)}, "Failed to list guild roles");
        return Err(createError(describeError(error), "INTEGRATION_ERROR"));
    }
}
