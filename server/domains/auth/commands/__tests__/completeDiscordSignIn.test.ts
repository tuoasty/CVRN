import {beforeEach, describe, expect, it, vi} from "vitest";
import {Err, Ok} from "@/shared/types/result";
import type {DBClient} from "@/shared/types/db";

const mocks = vi.hoisted(() => ({
    findUserAccount: vi.fn(),
    upsertUserAccount: vi.fn(),
    deleteUserAccount: vi.fn(),
    getGuildMember: vi.fn(),
    getCurrentGroups: vi.fn(),
    deleteUser: vi.fn(),
}));

vi.mock("server-only", () => ({}));
vi.mock("@/server/db/userAccounts.repo", () => ({
    findUserAccount: mocks.findUserAccount,
    upsertUserAccount: mocks.upsertUserAccount,
    deleteUserAccount: mocks.deleteUserAccount,
}));
vi.mock("@/server/discord/client", () => ({getGuildMember: mocks.getGuildMember}));
vi.mock("../../queries/getCurrentGroups", () => ({getCurrentGroups: mocks.getCurrentGroups}));
vi.mock("@/server/supabase/admin", () => ({getSupabaseAdmin: () => ({auth: {admin: {deleteUser: mocks.deleteUser}}})}));
vi.mock("@/server/utils/logger", () => {
    const log = {info: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn()};
    return {logger: {...log, child: () => log}};
});

import {completeDiscordSignIn} from "../completeDiscordSignIn";

const discordUser = {
    id: "u1",
    user_metadata: {provider_id: "forged", full_name: "forged"},
    app_metadata: {provider: "discord"},
    identities: [{
        provider: "discord",
        id: "d1",
        identity_data: {provider_id: "d1", sub: "d1", full_name: "kev", name: "kevin", avatar_url: "https://cdn.discordapp.com/a.png", custom_claims: {global_name: "Kevin"}},
    }],
};

const emailUserWithForgedMetadata = {
    id: "u2",
    user_metadata: {provider_id: "d1", sub: "d1"},
    app_metadata: {provider: "email"},
    identities: [{provider: "email", id: "u2", identity_data: {email: "x@example.com"}}],
};

function client(user: unknown = discordUser) {
    return {
        auth: {
            exchangeCodeForSession: vi.fn().mockResolvedValue({data: {user, session: {}}, error: null}),
            signOut: vi.fn().mockResolvedValue({error: null}),
        },
    } as unknown as DBClient & {auth: {signOut: ReturnType<typeof vi.fn>}};
}

describe("completeDiscordSignIn", () => {
    beforeEach(() => {
        vi.clearAllMocks();
        mocks.findUserAccount.mockResolvedValue(Ok(null));
        mocks.upsertUserAccount.mockResolvedValue(Ok(true));
        mocks.deleteUserAccount.mockResolvedValue(Ok(true));
        mocks.deleteUser.mockResolvedValue({error: null});
        mocks.getGuildMember.mockResolvedValue(Ok({roles: ["r1"]}));
    });

    it("signs in a user whose role is mapped", async () => {
        mocks.getCurrentGroups.mockResolvedValue(Ok(["statistics"]));
        const supabase = client();

        const result = await completeDiscordSignIn(supabase, "code");

        expect(result).toEqual(Ok({groups: ["statistics"]}));
        expect(mocks.upsertUserAccount).toHaveBeenCalledWith(expect.anything(), expect.objectContaining({
            user_id: "u1", discord_user_id: "d1", discord_display_name: "Kevin", discord_username: "kevin",
            discord_avatar_url: "https://cdn.discordapp.com/a.png", role_ids: ["r1"],
        }));
        expect(supabase.auth.signOut).not.toHaveBeenCalled();
    });

    it("signs out and deletes a brand-new user with no mapped role", async () => {
        mocks.getCurrentGroups.mockResolvedValue(Ok([]));
        const supabase = client();

        const result = await completeDiscordSignIn(supabase, "code");

        expect(result.ok).toBe(false);
        if (!result.ok) expect(result.error.reason).toBe("no_role");
        expect(supabase.auth.signOut).toHaveBeenCalled();
        expect(mocks.deleteUserAccount).toHaveBeenCalledWith(expect.anything(), "u1");
        expect(mocks.deleteUser).toHaveBeenCalledWith("u1");
    });

    it("keeps an existing account when it has no mapped role", async () => {
        mocks.findUserAccount.mockResolvedValue(Ok({user_id: "u1", discord_user_id: "d1", role_ids: ["r1"], roles_verified_at: null, roles_valid_until: null}));
        mocks.getCurrentGroups.mockResolvedValue(Ok([]));
        const supabase = client();

        const result = await completeDiscordSignIn(supabase, "code");

        expect(result.ok).toBe(false);
        expect(supabase.auth.signOut).toHaveBeenCalled();
        expect(mocks.deleteUser).not.toHaveBeenCalled();
        expect(mocks.deleteUserAccount).not.toHaveBeenCalled();
    });

    it("reports discord_unavailable when Discord errors on first sign-in", async () => {
        mocks.getGuildMember.mockResolvedValue(Err({message: "down", code: "INTEGRATION_ERROR"}));
        mocks.getCurrentGroups.mockResolvedValue(Ok([]));

        const result = await completeDiscordSignIn(client(), "code");

        expect(result.ok).toBe(false);
        if (!result.ok) expect(result.error.reason).toBe("discord_unavailable");
    });

    it("accepts the owner even when not a member of the guild", async () => {
        mocks.getGuildMember.mockResolvedValue(Ok(null));
        mocks.getCurrentGroups.mockResolvedValue(Ok(["super_admin", "admin"]));

        const result = await completeDiscordSignIn(client(), "code");

        expect(result.ok).toBe(true);
        expect(mocks.upsertUserAccount).toHaveBeenCalledWith(expect.anything(), expect.objectContaining({role_ids: []}));
    });

    it("refuses an email account that forged a Discord ID in user_metadata", async () => {
        const supabase = client(emailUserWithForgedMetadata);

        const result = await completeDiscordSignIn(supabase, "code");

        expect(result.ok).toBe(false);
        if (!result.ok) expect(result.error.reason).toBe("failed");
        expect(mocks.getGuildMember).not.toHaveBeenCalled();
        expect(mocks.upsertUserAccount).not.toHaveBeenCalled();
        expect(supabase.auth.signOut).toHaveBeenCalled();
    });

    it("fails without touching accounts when the code exchange fails", async () => {
        const supabase = client();
        (supabase.auth as unknown as {exchangeCodeForSession: ReturnType<typeof vi.fn>}).exchangeCodeForSession
            .mockResolvedValue({data: {user: null, session: null}, error: {message: "bad code"}});

        const result = await completeDiscordSignIn(supabase, "code");

        expect(result.ok).toBe(false);
        if (!result.ok) expect(result.error.reason).toBe("failed");
        expect(mocks.upsertUserAccount).not.toHaveBeenCalled();
    });
});
