import {describe, expect, it} from "vitest";
import {nextRoleValidity, ROLE_GRACE_MS, ROLE_TTL_MS} from "../nextRoleValidity";

const now = new Date("2026-11-11T12:00:00.000Z");
const current = (verifiedAt: string | null) => ({
    roleIds: ["old"],
    rolesVerifiedAt: verifiedAt,
    rolesValidUntil: "2026-11-11T11:59:00.000Z",
});

describe("nextRoleValidity", () => {
    it("uses a 5 minute window and a 1 hour grace", () => {
        expect(ROLE_TTL_MS).toBe(300000);
        expect(ROLE_GRACE_MS).toBe(3600000);
    });

    it("copies member roles and opens a fresh window", () => {
        expect(nextRoleValidity({kind: "member", roles: ["r1"]}, current("2026-11-11T11:00:00.000Z"), now)).toEqual({
            roleIds: ["r1"],
            rolesVerifiedAt: "2026-11-11T12:00:00.000Z",
            rolesValidUntil: "2026-11-11T12:05:00.000Z",
        });
    });

    it("clears roles for a non-member", () => {
        expect(nextRoleValidity({kind: "not_member"}, current("2026-11-11T11:00:00.000Z"), now)).toEqual({
            roleIds: [],
            rolesVerifiedAt: "2026-11-11T12:00:00.000Z",
            rolesValidUntil: "2026-11-11T12:05:00.000Z",
        });
    });

    it("keeps roles through a Discord error within the grace hour", () => {
        expect(nextRoleValidity({kind: "error"}, current("2026-11-11T11:40:00.000Z"), now)).toEqual({
            roleIds: ["old"],
            rolesVerifiedAt: "2026-11-11T11:40:00.000Z",
            rolesValidUntil: "2026-11-11T12:05:00.000Z",
        });
    });

    it("leaves the window expired on a Discord error past the grace hour", () => {
        expect(nextRoleValidity({kind: "error"}, current("2026-11-11T10:00:00.000Z"), now)).toEqual({
            roleIds: ["old"],
            rolesVerifiedAt: "2026-11-11T10:00:00.000Z",
            rolesValidUntil: "2026-11-11T11:59:00.000Z",
        });
    });

    it("grants nothing on a Discord error with no prior verification", () => {
        expect(nextRoleValidity({kind: "error"}, null, now)).toEqual({roleIds: [], rolesVerifiedAt: null, rolesValidUntil: null});
        expect(nextRoleValidity({kind: "error"}, current(null), now)).toEqual({roleIds: ["old"], rolesVerifiedAt: null, rolesValidUntil: "2026-11-11T11:59:00.000Z"});
    });
});
