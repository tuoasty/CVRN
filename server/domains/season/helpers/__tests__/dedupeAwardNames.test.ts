import {describe, it, expect} from "vitest";
import {dedupeAwardNames} from "../dedupeAwardNames";

describe("dedupeAwardNames", () => {
    it("keeps input order, which is most recent first from the repo", () => {
        expect(dedupeAwardNames([{award_name: "Finals MVP"}, {award_name: "MVP"}, {award_name: "Best Setter"}]))
            .toEqual(["Finals MVP", "MVP", "Best Setter"]);
    });

    it("dedupes case-insensitively and keeps the first-seen casing", () => {
        expect(dedupeAwardNames([{award_name: "Best Setter"}, {award_name: "best setter"}, {award_name: "BEST SETTER"}]))
            .toEqual(["Best Setter"]);
    });

    it("trims names and treats padded duplicates as the same name", () => {
        expect(dedupeAwardNames([{award_name: "  MVP "}, {award_name: "mvp"}])).toEqual(["MVP"]);
    });

    it("skips blank names", () => {
        expect(dedupeAwardNames([{award_name: "   "}, {award_name: ""}, {award_name: "OH"}])).toEqual(["OH"]);
    });

    it("returns an empty list for no rows", () => {
        expect(dedupeAwardNames([])).toEqual([]);
    });
});
