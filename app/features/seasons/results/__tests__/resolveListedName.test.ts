import {describe, expect, it} from "vitest";
import {filterSuggestions} from "../AwardNameCombobox";
import {resolveListedName} from "../stagedAwards";

describe("resolveListedName", () => {
    it("returns the list's spelling for a trimmed case-insensitive match", () => {
        expect(resolveListedName(" best setter ", ["Best Setter"])).toBe("Best Setter");
    });

    it("rejects a partial name", () => {
        expect(resolveListedName("Best Middle", ["Best Middle Blocker"])).toBeNull();
    });

    it("rejects an empty name", () => {
        expect(resolveListedName("", ["Best Setter"])).toBeNull();
    });
});

describe("filterSuggestions", () => {
    const list = Array.from({length: 16}, (_, i) => `Award ${i + 1}`);

    it("caps history suggestions at 8 by default", () => {
        expect(filterSuggestions(list, "")).toHaveLength(8);
    });

    it("can show a whole list in its order", () => {
        expect(filterSuggestions(list, "", list.length)).toEqual(list);
    });
});
