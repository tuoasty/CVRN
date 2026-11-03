import {describe, expect, it} from "vitest";
import {toPublicPlayerCards, type PublicPlayerCardRow} from "../toCardShapes";

function row(seasonNumber: number, sortOrder: number, patch: Partial<PublicPlayerCardRow> = {}): PublicPlayerCardRow {
    return {
        season_number: seasonNumber,
        group_id: `group-${sortOrder}`,
        ovr: 90,
        image_url: `https://cdn/${seasonNumber}-${sortOrder}.png`,
        group: {name: `Group ${sortOrder}`, sort_order: sortOrder, canvas_width: 1000, canvas_height: 1400},
        team: {name: "Revenant"},
        ...patch,
    };
}

describe("toPublicPlayerCards", () => {
    it("sorts newest season first, then lowest group sort order", () => {
        const cards = toPublicPlayerCards([row(2, 1), row(3, 1), row(2, 0), row(3, 0)]);
        expect(cards.map(c => [c.seasonNumber, c.groupName])).toEqual([
            [3, "Group 0"],
            [3, "Group 1"],
            [2, "Group 0"],
            [2, "Group 1"],
        ]);
    });

    it("falls back to group name when sort orders tie", () => {
        const a = row(3, 0, {group: {name: "Alpha", sort_order: 0, canvas_width: 1000, canvas_height: 1400}});
        const b = row(3, 0, {group: {name: "Beta", sort_order: 0, canvas_width: 1000, canvas_height: 1400}});
        expect(toPublicPlayerCards([b, a]).map(c => c.groupName)).toEqual(["Alpha", "Beta"]);
    });

    it("keeps a null team as a null name", () => {
        expect(toPublicPlayerCards([row(3, 0, {team: null})])[0].teamName).toBeNull();
    });

    it("takes the size from the group canvas", () => {
        const card = toPublicPlayerCards([row(3, 0, {group: {name: "Wide", sort_order: 0, canvas_width: 800, canvas_height: 1200}})])[0];
        expect(card).toMatchObject({width: 800, height: 1200});
    });
});
