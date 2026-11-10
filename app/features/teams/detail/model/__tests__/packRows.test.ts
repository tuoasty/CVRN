import {describe, expect, it} from "vitest";
import {packRows} from "../packRows";

describe("packRows", () => {
    it("fills the space left in a row with a later item that fits", () => {
        expect(packRows([300, 300, 200, 100], 610, 10)).toEqual([[0, 1], [2, 3]]);
        expect(packRows([300, 400, 250], 610, 10)).toEqual([[0, 2], [1]]);
    });

    it("keeps date order when everything fits", () => {
        expect(packRows([100, 100, 100], 400, 10)).toEqual([[0, 1, 2]]);
    });

    it("gives an item wider than the container its own row", () => {
        expect(packRows([900, 100], 500, 10)).toEqual([[0], [1]]);
    });

    it("returns no rows for no items", () => {
        expect(packRows([], 500, 10)).toEqual([]);
    });
});
