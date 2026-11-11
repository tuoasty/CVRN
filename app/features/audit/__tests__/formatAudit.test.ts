import {describe, expect, it} from "vitest";
import {auditActionLabel, formatAuditTarget, humanizeAction} from "../formatAudit";

describe("humanizeAction", () => {
    it("splits camel case into a sentence", () => {
        expect(humanizeAction("completeMatch")).toBe("Complete match");
        expect(humanizeAction("signIn")).toBe("Sign in");
    });

    it("keeps a single word", () => {
        expect(humanizeAction("publishStats")).toBe("Publish stats");
        expect(humanizeAction("reset")).toBe("Reset");
    });
});

describe("auditActionLabel", () => {
    it("names sign-in and sign-out rows by what happened", () => {
        expect(auditActionLabel({kind: "auth", action: "signIn", outcome: "allowed", target: null})).toBe("Signed in");
        expect(auditActionLabel({kind: "auth", action: "signIn", outcome: "denied", target: {reason: "no_role"}})).toBe("Sign-in refused (no staff role)");
        expect(auditActionLabel({kind: "auth", action: "signIn", outcome: "denied", target: {reason: "discord_unavailable"}})).toBe("Sign-in refused (Discord unreachable)");
        expect(auditActionLabel({kind: "auth", action: "signIn", outcome: "denied", target: {reason: "failed"}})).toBe("Sign-in refused (failed)");
        expect(auditActionLabel({kind: "auth", action: "signOut", outcome: "allowed", target: null})).toBe("Signed out");
    });

    it("humanizes action rows", () => {
        expect(auditActionLabel({kind: "action", action: "deleteTeam", outcome: "denied", target: null})).toBe("Delete team");
    });
});

describe("formatAuditTarget", () => {
    it("joins key: value pairs", () => {
        expect(formatAuditTarget({matchId: "m1", week: 3})).toBe("matchId: m1, week: 3");
    });

    it("joins arrays with a slash", () => {
        expect(formatAuditTarget({groups: ["admin", "media"], published: false})).toBe("groups: admin/media, published: false");
    });

    it("prints null values", () => {
        expect(formatAuditTarget({note: null})).toBe("note: null");
    });

    it("is empty for no target", () => {
        expect(formatAuditTarget(null)).toBe("");
        expect(formatAuditTarget({})).toBe("");
    });

    it("leaves out the reason on sign-in rows", () => {
        expect(formatAuditTarget({reason: "no_role"}, "auth")).toBe("");
    });
});
