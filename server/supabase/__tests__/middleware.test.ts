import {beforeEach, describe, expect, it, vi} from "vitest";
import {NextRequest} from "next/server";
import {Ok} from "@/shared/types/result";

const mocks = vi.hoisted(() => ({
    getUser: vi.fn(),
    signOut: vi.fn(),
    findUserAccount: vi.fn(),
    getCurrentGroups: vi.fn(),
    refreshMemberRoles: vi.fn(),
}));

vi.mock("@supabase/ssr", () => ({
    createServerClient: () => ({auth: {getUser: mocks.getUser, signOut: mocks.signOut}}),
}));
vi.mock("@/lib/utils", () => ({hasEnvVars: true}));
vi.mock("@/server/db/userAccounts.repo", () => ({findUserAccount: mocks.findUserAccount}));
vi.mock("@/server/domains/auth/queries/getCurrentGroups", () => ({getCurrentGroups: mocks.getCurrentGroups}));
vi.mock("@/server/domains/auth/commands/refreshMemberRoles", () => ({refreshMemberRoles: mocks.refreshMemberRoles}));
vi.mock("@/server/utils/logger", () => {
    const log = {info: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn()};
    return {logger: {...log, child: () => log}};
});

import {updateSession} from "../middleware";

const fresh = () => Ok({roles_valid_until: new Date(Date.now() + 120000).toISOString()});

describe("updateSession on /admin", () => {
    beforeEach(() => {
        vi.clearAllMocks();
        mocks.getUser.mockResolvedValue({data: {user: {id: "u1"}}});
        mocks.signOut.mockResolvedValue({error: null});
        mocks.findUserAccount.mockResolvedValue(fresh());
    });

    it("sends a signed-out visitor to login with a return path", async () => {
        mocks.getUser.mockResolvedValue({data: {user: null}});

        const response = await updateSession(new NextRequest("http://localhost:3000/admin/stats?week=2"));

        expect(response.headers.get("location")).toBe("http://localhost:3000/auth/login?returnUrl=%2Fadmin%2Fstats%3Fweek%3D2");
    });

    it("signs out a session with no account and no groups and sends it to login", async () => {
        mocks.findUserAccount.mockResolvedValue(Ok(null));
        mocks.getCurrentGroups.mockResolvedValue(Ok([]));

        const response = await updateSession(new NextRequest("http://localhost:3000/admin/teams"));

        expect(mocks.signOut).toHaveBeenCalled();
        expect(response.headers.get("location")).toBe("http://localhost:3000/auth/login?error=no_role");
    });

    it("signs out a Discord account left with no groups", async () => {
        mocks.getCurrentGroups.mockResolvedValue(Ok([]));

        const response = await updateSession(new NextRequest("http://localhost:3000/admin/teams"));

        expect(mocks.signOut).toHaveBeenCalled();
        expect(response.headers.get("location")).toBe("http://localhost:3000/auth/login?error=no_role");
    });

    it("refreshes roles when the validity window is about to close", async () => {
        mocks.findUserAccount.mockResolvedValue(Ok({roles_valid_until: new Date(Date.now() + 5000).toISOString()}));
        mocks.getCurrentGroups.mockResolvedValue(Ok(["admin"]));

        await updateSession(new NextRequest("http://localhost:3000/admin/teams"));

        expect(mocks.refreshMemberRoles).toHaveBeenCalledWith("u1");
    });

    it("lets a graphics-only user open the dashboard", async () => {
        mocks.getCurrentGroups.mockResolvedValue(Ok(["graphics"]));

        const response = await updateSession(new NextRequest("http://localhost:3000/admin/dashboard"));

        expect(mocks.signOut).not.toHaveBeenCalled();
        expect(response.headers.get("location")).toBeNull();
    });

    it("sends a user to their landing page from a page their groups cannot open", async () => {
        mocks.getCurrentGroups.mockResolvedValue(Ok(["transaction"]));

        const response = await updateSession(new NextRequest("http://localhost:3000/admin/sync"));

        expect(mocks.signOut).not.toHaveBeenCalled();
        expect(response.headers.get("location")).toBe("http://localhost:3000/admin/teams");
    });

    it("sends an admin away from the super_admin staff page", async () => {
        mocks.getCurrentGroups.mockResolvedValue(Ok(["admin"]));

        const response = await updateSession(new NextRequest("http://localhost:3000/admin/staff"));

        expect(response.headers.get("location")).toBe("http://localhost:3000/admin/dashboard");
    });

    it("lets a super_admin open the staff page", async () => {
        mocks.getCurrentGroups.mockResolvedValue(Ok(["super_admin"]));

        const response = await updateSession(new NextRequest("http://localhost:3000/admin/staff"));

        expect(response.headers.get("location")).toBeNull();
    });
});

describe("updateSession on /auth/login", () => {
    beforeEach(() => {
        vi.clearAllMocks();
        mocks.getUser.mockResolvedValue({data: {user: {id: "u1"}}});
    });

    it("sends a signed-in user to an allowed return path", async () => {
        mocks.getCurrentGroups.mockResolvedValue(Ok(["statistics"]));

        const response = await updateSession(new NextRequest("http://localhost:3000/auth/login?returnUrl=%2Fadmin%2Fstats"));

        expect(response.headers.get("location")).toBe("http://localhost:3000/admin/stats");
    });

    it("sends a signed-in user to their landing page when the return path is not theirs", async () => {
        mocks.getCurrentGroups.mockResolvedValue(Ok(["statistics"]));

        const response = await updateSession(new NextRequest("http://localhost:3000/auth/login?returnUrl=%2Fadmin%2Fsync"));

        expect(response.headers.get("location")).toBe("http://localhost:3000/admin/stats");
    });

    it("shows the login page to a session with no groups", async () => {
        mocks.getCurrentGroups.mockResolvedValue(Ok([]));

        const response = await updateSession(new NextRequest("http://localhost:3000/auth/login"));

        expect(response.headers.get("location")).toBeNull();
    });
});
