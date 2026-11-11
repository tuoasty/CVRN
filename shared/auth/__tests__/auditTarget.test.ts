import {describe, expect, it} from "vitest";
import {toAuditTarget} from "../auditTarget";

describe("toAuditTarget", () => {
    it("keeps ids, numbers and booleans", () => {
        expect(toAuditTarget({matchId: "m1", week: 3, published: false, note: null}))
            .toEqual({matchId: "m1", week: 3, published: false, note: null});
    });

    it("drops a 5000-character body", () => {
        expect(toAuditTarget({articleId: "a1", body: "x".repeat(5000)})).toEqual({articleId: "a1"});
    });

    it("drops a File and nested objects", () => {
        const file = new File(["png"], "logo.png", {type: "image/png"});
        expect(toAuditTarget({teamId: "t1", file, meta: {a: 1}, when: new Date()})).toEqual({teamId: "t1"});
    });

    it("turns a 25-item array into <key>Count: 25", () => {
        const ids = Array.from({length: 25}, (_, i) => `p${i}`);
        expect(toAuditTarget({ids, groups: ["admin", "media"]}))
            .toEqual({idsCount: 25, groups: ["admin", "media"]});
    });

    it("counts an array of objects instead of keeping it", () => {
        expect(toAuditTarget({changes: [{roleId: "r1"}, {roleId: "r2"}]})).toEqual({changesCount: 2});
    });

    it("keeps at most 20 keys", () => {
        const input = Object.fromEntries(Array.from({length: 30}, (_, i) => [`k${i}`, i]));
        const result = toAuditTarget(input);
        expect(Object.keys(result ?? {})).toHaveLength(20);
    });

    it("drops undefined and non-finite numbers", () => {
        expect(toAuditTarget({a: undefined, b: Number.NaN, c: 1})).toEqual({c: 1});
    });

    it("returns null for a string input", () => {
        expect(toAuditTarget("matchId")).toBeNull();
    });

    it("returns null for an array input", () => {
        expect(toAuditTarget(["m1"])).toBeNull();
    });

    it("returns null when nothing is left", () => {
        expect(toAuditTarget({body: "x".repeat(300)})).toBeNull();
    });
});
