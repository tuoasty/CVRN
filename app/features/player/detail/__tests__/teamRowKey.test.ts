import {describe, expect, it} from "vitest";
import {teamRowKey} from "../teamHistoryPreview";

describe("teamRowKey", () => {
    it("gives two stints on one team in one season different keys", () => {
        const stint = {team_id: "team-a", season_id: "s2"};
        expect(teamRowKey(stint, 0)).not.toBe(teamRowKey(stint, 1));
    });
});
