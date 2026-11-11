import {describe, expect, it} from "vitest";
import {safeReturnPath} from "../safeReturnPath";

describe("safeReturnPath", () => {
    it("keeps a same-origin path", () => {
        expect(safeReturnPath("/admin/stats")).toBe("/admin/stats");
        expect(safeReturnPath("/admin/teams?region=eu")).toBe("/admin/teams?region=eu");
    });

    it.each([
        ["https://evil.example"],
        ["//evil.example"],
        ["/\\evil.example"],
        ["javascript:alert(1)"],
        ["/.//evil.example"],
        ["/a/..//evil.example"],
        ["admin/stats"],
        [""],
    ])("rejects %s", (raw) => {
        expect(safeReturnPath(raw)).toBeNull();
    });

    it("rejects null", () => {
        expect(safeReturnPath(null)).toBeNull();
    });
});
