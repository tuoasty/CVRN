import {afterEach, beforeEach, describe, expect, it, vi} from "vitest";
import {AxiosError, AxiosHeaders} from "axios";

vi.mock("server-only", () => ({}));
vi.mock("@/server/utils/logger", () => {
    const log = {info: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn()};
    return {logger: {...log, child: () => log}};
});

import {discordApi, getGuildMember, listGuildRoles} from "../client";

function axiosError(status: number, data: unknown) {
    return new AxiosError("fail", String(status), undefined, undefined, {
        status, statusText: "", headers: {}, config: {headers: new AxiosHeaders()}, data,
    });
}

describe("discord client", () => {
    beforeEach(() => {
        process.env.DISCORD_TOKEN = "t";
        process.env.DISCORD_GUILD_ID = "g1";
    });
    afterEach(() => vi.restoreAllMocks());

    it("getGuildMember returns roles on 200", async () => {
        const get = vi.spyOn(discordApi, "get").mockResolvedValue({data: {roles: ["r1", "r2"], user: {id: "u1"}}});

        const result = await getGuildMember("u1");

        expect(get).toHaveBeenCalledWith("/guilds/g1/members/u1", expect.objectContaining({headers: {Authorization: "Bot t"}}));
        expect(result).toEqual({ok: true, value: {roles: ["r1", "r2"]}});
    });

    it("getGuildMember returns Ok(null) on 404 with code 10007", async () => {
        vi.spyOn(discordApi, "get").mockRejectedValue(axiosError(404, {code: 10007, message: "Unknown Member"}));

        expect(await getGuildMember("u1")).toEqual({ok: true, value: null});
    });

    it("getGuildMember treats 404 Unknown Guild as an error, not as not-a-member", async () => {
        vi.spyOn(discordApi, "get").mockRejectedValue(axiosError(404, {code: 10004, message: "Unknown Guild"}));

        const result = await getGuildMember("u1");

        expect(result.ok).toBe(false);
    });

    it("getGuildMember returns INTEGRATION_ERROR on 500", async () => {
        vi.spyOn(discordApi, "get").mockRejectedValue(axiosError(500, {}));

        const result = await getGuildMember("u1");

        expect(result.ok).toBe(false);
        if (!result.ok) expect(result.error.code).toBe("INTEGRATION_ERROR");
    });

    it("getGuildMember returns INTEGRATION_ERROR when env is missing", async () => {
        delete process.env.DISCORD_TOKEN;
        const get = vi.spyOn(discordApi, "get");

        const result = await getGuildMember("u1");

        expect(result.ok).toBe(false);
        if (!result.ok) expect(result.error.code).toBe("INTEGRATION_ERROR");
        expect(get).not.toHaveBeenCalled();
    });

    it("listGuildRoles excludes @everyone and sorts by position descending", async () => {
        vi.spyOn(discordApi, "get").mockResolvedValue({data: [
            {id: "g1", name: "@everyone", position: 0, managed: false},
            {id: "a", name: "Staff", position: 2, managed: false},
            {id: "b", name: "Admin", position: 5, managed: false},
            {id: "c", name: "Bot", position: 3, managed: true},
        ]});

        const result = await listGuildRoles();

        expect(result).toEqual({ok: true, value: [
            {id: "b", name: "Admin", position: 5, managed: false},
            {id: "c", name: "Bot", position: 3, managed: true},
            {id: "a", name: "Staff", position: 2, managed: false},
        ]});
    });
});
