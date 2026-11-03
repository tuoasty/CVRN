import {describe, expect, it} from "vitest";
import {formatDate} from "../awardDisplay";

describe("formatDate", () => {
    it.each([
        ["AS", "Mar 2, 2026"],
        ["NA", "Mar 1, 2026"],
        ["eu", "Mar 1, 2026"],
    ])("shows the date in %s time, whatever the viewer's timezone", (region, expected) => {
        expect(formatDate("2026-03-01T20:00:00.000Z", region)).toBe(expected);
    });

    it("shows a dash when there is no date", () => {
        expect(formatDate(null, "EU")).toBe("-");
    });
});
