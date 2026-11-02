import { describe, expect, it } from "vitest";
import {
    adminNavHrefs,
    buildAdminNav,
    findCurrentHref,
    showsRegionSeasonPicker,
} from "@/app/components/admin/navigation/adminNav";

describe("buildAdminNav", () => {
    it("gives super_admin all four groups in design order", () => {
        const nav = buildAdminNav("super_admin");
        expect(nav.primary.map(p => p.label)).toEqual(["Dashboard", "Teams", "Matches", "Media"]);
        expect(nav.groups.map(g => [g.label, g.pages.map(p => p.label)])).toEqual([
            ["League", ["Standings", "Playoffs", "Match Stats", "Seasons"]],
            ["Content", ["Articles", "Updates", "Information"]],
            ["Ratings", ["Specs", "Spec Calibration", "Overalls", "Player Cards", "Card Groups"]],
            ["System", ["Sync", "Sync History", "Cache", "Invite"]],
        ]);
    });

    it("hides Cache and Invite from admin", () => {
        const system = buildAdminNav("admin").groups.find(g => g.label === "System");
        expect(system?.pages.map(p => p.label)).toEqual(["Sync", "Sync History"]);
    });

    it("renders limited roles flat with no groups", () => {
        expect(buildAdminNav("stat_tracker")).toEqual({
            primary: [{ href: "/admin/sync/history", label: "Sync History" }],
            groups: [],
        });
        expect(buildAdminNav("staff").primary.map(p => p.href)).toEqual(["/admin/teams", "/admin/sync/history"]);
        expect(buildAdminNav("staff").groups).toEqual([]);
        expect(buildAdminNav("information_manager").primary.map(p => p.href)).toEqual(["/admin/game-data"]);
        expect(buildAdminNav("none")).toEqual({ primary: [], groups: [] });
    });

    it("applies the spec_manager Information override", () => {
        const nav = buildAdminNav("spec_manager");
        expect(nav.groups).toEqual([]);
        expect(nav.primary.map(p => p.href)).toEqual([
            "/admin/game-data/specs",
            "/admin/specs",
            "/admin/specs/qualify",
        ]);
    });

    it("keeps everything but super admin pages for an unknown role", () => {
        const nav = buildAdminNav(null);
        expect(nav.groups).toHaveLength(4);
        expect(adminNavHrefs(nav)).not.toContain("/admin/cache");
        expect(adminNavHrefs(nav)).not.toContain("/admin/invite");
    });
});

describe("findCurrentHref", () => {
    const hrefs = adminNavHrefs(buildAdminNav("super_admin"));

    it.each([
        ["/admin/dashboard", "/admin/dashboard"],
        ["/admin/specs", "/admin/specs"],
        ["/admin/specs/qualify", "/admin/specs/qualify"],
        ["/admin/matches/abc", "/admin/matches"],
        ["/admin/sync", "/admin/sync"],
        ["/admin/sync/history", "/admin/sync/history"],
        ["/admin/cards", "/admin/cards"],
        ["/admin/cards/groups", "/admin/cards/groups"],
        ["/admin/game-data/rollables", "/admin/game-data"],
        ["/admin/seasons/abc/results", "/admin/seasons"],
        ["/admin/teams/as/season-3/nonchalant", "/admin/teams"],
    ])("marks %s as %s", (path, href) => {
        expect(findCurrentHref(path, hrefs)).toBe(href);
    });

    it("needs a segment boundary", () => {
        expect(findCurrentHref("/admin/sync-foo", hrefs)).toBeNull();
    });

    it("finds the spec_manager override route", () => {
        const specHrefs = adminNavHrefs(buildAdminNav("spec_manager"));
        expect(findCurrentHref("/admin/game-data/specs", specHrefs)).toBe("/admin/game-data/specs");
    });
});

describe("showsRegionSeasonPicker", () => {
    it.each([
        "/admin/matches",
        "/admin/media",
        "/admin/stats",
        "/admin/standings",
        "/admin/playoffs",
        "/admin/articles",
        "/admin/specs/qualify",
    ])("shows on %s", path => {
        expect(showsRegionSeasonPicker(path)).toBe(true);
    });

    it.each([
        "/admin/dashboard",
        "/admin/seasons",
        "/admin/updates",
        "/admin/game-data",
        "/admin/sync",
        "/admin/sync/history",
        "/admin/cache",
        "/admin/invite",
        "/admin/teams",
        "/admin/specs",
        "/admin/overalls",
        "/admin/cards",
        "/admin/cards/groups",
        "/admin/matches/abc",
    ])("hides on %s", path => {
        expect(showsRegionSeasonPicker(path)).toBe(false);
    });
});
