import {describe, expect, it} from "vitest";
import {fixtureHref} from "../fixtureHref";

const base = {matchId: "uuid-1", matchCode: "W2-M3", homeTeamName: "Aurora VC", awayTeamName: "Bluefin", regionCode: "EU", seasonSlug: "season-3"};

describe("fixtureHref", () => {
    it("links admin to the match id page", () => {
        expect(fixtureHref({...base, linkMode: "admin"})).toBe("/admin/matches/uuid-1");
    });

    it("links public to the match slug page", () => {
        expect(fixtureHref({...base, linkMode: "public"})).toBe("/eu/season-3/matches/w2-m3/aurora-vc-vs-bluefin");
    });

    it("has no public link without both team names", () => {
        expect(fixtureHref({...base, linkMode: "public", awayTeamName: null})).toBeNull();
    });
});
