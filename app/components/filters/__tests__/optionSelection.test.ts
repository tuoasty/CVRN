import {describe, expect, it} from "vitest";
import {isAllSelected, isOptionSelected, toggleOptionValue} from "../optionSelection";

describe("single selection", () => {
    it("selects All when the value is null", () => {
        expect(isAllSelected({multi: false, value: null})).toBe(true);
        expect(isAllSelected({multi: false, value: "NA"})).toBe(false);
    });

    it("marks only the matching option", () => {
        const s = {multi: false as const, value: "NA"};
        expect(isOptionSelected(s, "NA")).toBe(true);
        expect(isOptionSelected(s, "EU")).toBe(false);
    });
});

describe("multi selection", () => {
    it("selects All when nothing is selected", () => {
        expect(isAllSelected({multi: true, values: []})).toBe(true);
        expect(isAllSelected({multi: true, values: ["s4"]})).toBe(false);
    });

    it("marks every selected option", () => {
        const s = {multi: true as const, values: ["s4", "s2"]};
        expect(isOptionSelected(s, "s4")).toBe(true);
        expect(isOptionSelected(s, "s2")).toBe(true);
        expect(isOptionSelected(s, "s3")).toBe(false);
    });

    it("toggles a value on and off, keeping order", () => {
        expect(toggleOptionValue(["s4"], "s2")).toEqual(["s4", "s2"]);
        expect(toggleOptionValue(["s4", "s2"], "s4")).toEqual(["s2"]);
    });

    it("returns to All when the last value is toggled off", () => {
        const next = toggleOptionValue(["s4"], "s4");
        expect(isAllSelected({multi: true, values: next})).toBe(true);
    });
});
