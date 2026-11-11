import {beforeEach, describe, expect, it, vi} from "vitest";
import {NextRequest} from "next/server";
import {Ok} from "@/shared/types/result";

const mocks = vi.hoisted(() => ({
    getUser: vi.fn(),
    signOut: vi.fn(),
    getUserRole: vi.fn(),
    findUserAccount: vi.fn(),
    getCurrentGroups: vi.fn(),
    refreshMemberRoles: vi.fn(),
}));

vi.mock("@supabase/ssr", () => ({
    createServerClient: () => ({auth: {getUser: mocks.getUser, signOut: mocks.signOut}}),
}));
vi.mock("@/lib/utils", () => ({hasEnvVars: true}));
vi.mock("@/server/db/roles.repo", () => ({getUserRole: mocks.getUserRole}));
vi.mock("@/server/db/userAccounts.repo", () => ({findUserAccount: mocks.findUserAccount}));
vi.mock("@/server/domains/auth/queries/getCurrentGroups", () => ({getCurrentGroups: mocks.getCurrentGroups}));
vi.mock("@/server/domains/auth/commands/refreshMemberRoles", () => ({refreshMemberRoles: mocks.refreshMemberRoles}));
vi.mock("@/server/utils/logger", () => {
    const log = {info: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn()};
    return {logger: {...log, child: () => log}};
});

import {updateSession} from "../middleware";

describe("updateSession on /admin", () => {
    beforeEach(() => {
        vi.clearAllMocks();
        mocks.getUser.mockResolvedValue({data: {user: {id: "u1"}}});
        mocks.signOut.mockResolvedValue({error: null});
    });

    it("signs out a session with no role and no account and sends it to login", async () => {
        mocks.findUserAccount.mockResolvedValue(Ok(null));
        mocks.getUserRole.mockResolvedValue(Ok(null));

        const response = await updateSession(new NextRequest("http://localhost:3000/admin/teams"));

        expect(mocks.signOut).toHaveBeenCalled();
        expect(response.headers.get("location")).toBe("http://localhost:3000/auth/login?error=no_role");
    });

    it("signs out a Discord account left with no groups", async () => {
        mocks.findUserAccount.mockResolvedValue(Ok({roles_valid_until: new Date(Date.now() + 120000).toISOString()}));
        mocks.getCurrentGroups.mockResolvedValue(Ok([]));

        const response = await updateSession(new NextRequest("http://localhost:3000/admin/teams"));

        expect(mocks.signOut).toHaveBeenCalled();
        expect(response.headers.get("location")).toBe("http://localhost:3000/auth/login?error=no_role");
    });

    it("lets a user with a role through", async () => {
        mocks.findUserAccount.mockResolvedValue(Ok(null));
        mocks.getUserRole.mockResolvedValue(Ok("admin"));

        const response = await updateSession(new NextRequest("http://localhost:3000/admin/teams"));

        expect(mocks.signOut).not.toHaveBeenCalled();
        expect(response.headers.get("location")).toBeNull();
    });
});
