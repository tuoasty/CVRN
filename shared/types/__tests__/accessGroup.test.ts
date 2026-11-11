import {describe, expect, it} from "vitest";
import {ACCESS_GROUPS, isAccessGroup} from "../accessGroup";

describe("accessGroup", () => {
    it("lists the eleven groups in the SQL enum order", () => {
        expect(ACCESS_GROUPS).toEqual(["super_admin", "admin", "transaction", "graphics", "media", "articles", "information", "statistics", "specs", "player_cards", "awards"]);
    });

    it("recognises only known group names", () => {
        expect(isAccessGroup("statistics")).toBe(true);
        expect(isAccessGroup("stat_tracker")).toBe(false);
        expect(isAccessGroup(null)).toBe(false);
    });
});
