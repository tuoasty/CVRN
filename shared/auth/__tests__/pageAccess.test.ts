import {describe, expect, it} from "vitest";
import {canAccessPath, landingFor} from "@/shared/auth/pageAccess";

describe("canAccessPath", () => {
    it.each([
        [["information"], "/admin/game-data/import", false],
        [["information"], "/admin/game-data/rollables", true],
        [["specs"], "/admin/game-data/specs", false],
        [["information"], "/admin/game-data/specs", true],
        [["specs"], "/admin/game-data/rollables", false],
        [["awards"], "/admin/seasons/x/results", true],
        [["awards"], "/admin/seasons", true],
        [["awards"], "/admin/standings", false],
        [["transaction"], "/admin/sync/history", true],
        [["transaction"], "/admin/sync", false],
        [["transaction"], "/admin/teams", true],
        [["transaction"], "/admin/teams/as/season-3/nonchalant", false],
        [["graphics"], "/admin/matches", true],
        [["graphics"], "/admin/matches/abc", false],
        [["admin"], "/admin/staff", false],
        [["admin"], "/admin/cache", false],
        [["super_admin"], "/admin/staff", true],
        [["admin"], "/admin/audit", true],
        [["graphics"], "/admin/audit", false],
        [["super_admin"], "/admin/audit", true],
        [["admin"], "/admin/unknown-page", true],
        [["graphics"], "/admin/unknown-page", false],
        [["player_cards"], "/admin/cards/groups", true],
        [["specs"], "/admin/specs/qualify", true],
        [["information"], "/admin/specs/qualify", false],
        [["information"], "/admin/specs", false],
        [["specs"], "/admin/specs", true],
    ] as const)("%j on %s is %s", (groups, path, allowed) => {
        expect(canAccessPath([...groups], path)).toBe(allowed);
    });

    it("needs a segment boundary", () => {
        expect(canAccessPath(["transaction"], "/admin/sync/history-foo")).toBe(false);
    });

    it("denies an empty group list everywhere in admin", () => {
        expect(canAccessPath([], "/admin/dashboard")).toBe(false);
    });
});

describe("landingFor", () => {
    it.each([
        [["awards"], "/admin/seasons"],
        [["graphics"], "/admin/dashboard"],
        [["statistics"], "/admin/stats"],
        [["transaction"], "/admin/teams"],
        [["specs"], "/admin/specs"],
        [["information"], "/admin/game-data"],
        [["player_cards"], "/admin/overalls"],
        [["articles"], "/admin/articles"],
        [["admin"], "/admin/dashboard"],
        [[], "/"],
    ] as const)("%j lands on %s", (groups, path) => {
        expect(landingFor([...groups])).toBe(path);
    });
});
