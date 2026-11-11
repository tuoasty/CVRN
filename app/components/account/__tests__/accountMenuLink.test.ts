import {describe, expect, it} from "vitest";
import {accountMenuLink} from "../accountMenuLink";

describe("accountMenuLink", () => {
    it("sends a public staff user to their landing page", () => {
        expect(accountMenuLink("public", ["admin"])).toEqual({href: "/admin/dashboard", label: "Admin"});
        expect(accountMenuLink("public", ["statistics"])).toEqual({href: "/admin/stats", label: "Admin"});
    });

    it("shows no admin link on the public site without groups", () => {
        expect(accountMenuLink("public", [])).toBeNull();
    });

    it("sends the admin variant back to the site", () => {
        expect(accountMenuLink("admin", ["admin"])).toEqual({href: "/", label: "Back to site"});
        expect(accountMenuLink("admin", [])).toEqual({href: "/", label: "Back to site"});
    });
});
