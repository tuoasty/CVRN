import {describe, expect, it} from "vitest";
import {normalizeTeamName, teamNameKey} from "../normalizeTeamName";

const FIRE = "\u{1F525}";
const FLAG_GB = "\u{1F1EC}\u{1F1E7}";
const ASTRONAUT = "\u{1F469}\u{1F3FD}\u{200D}\u{1F680}"; 
const NO_ENTRY = "\u{1F6AB}";

describe("normalizeTeamName", () => {
    it("strips leading emoji and trims", () => {
        expect(normalizeTeamName(`${FIRE} Titans `)).toBe("Titans");
    });

    it("strips flag sequences", () => {
        expect(normalizeTeamName(`${FLAG_GB} United`)).toBe("United");
    });

    it("strips ZWJ sequences and skin-tone modifiers", () => {
        expect(normalizeTeamName(`${ASTRONAUT} Crew`)).toBe("Crew");
    });

    it("strips trademark and copyright pictographs", () => {
        expect(normalizeTeamName("Comets™")).toBe("Comets");
    });

    it("collapses internal whitespace", () => {
        expect(normalizeTeamName("  Deep   Blue  ")).toBe("Deep Blue");
    });

    it("preserves digits, hash and asterisk", () => {
        expect(normalizeTeamName("Team 99")).toBe("Team 99");
        expect(normalizeTeamName("C*mets #1")).toBe("C*mets #1");
    });

    it("leaves ordinary names untouched", () => {
        expect(normalizeTeamName("Titans")).toBe("Titans");
    });

    it("returns empty string for an emoji-only name", () => {
        expect(normalizeTeamName(FIRE)).toBe("");
    });
});

describe("teamNameKey", () => {
    it("lowercases after stripping", () => {
        expect(teamNameKey(`${FIRE} Titans `)).toBe("titans");
    });

    it("matches a decorated sheet cell against a plain DB name", () => {
        expect(teamNameKey(`${FIRE}  Titans `)).toBe(teamNameKey("Titans"));
    });

    it("matches a plain sheet cell against a legacy emoji DB name", () => {
        expect(teamNameKey("titans")).toBe(teamNameKey(`${FIRE} Titans`));
    });

    it("normalizes a decorated bye token", () => {
        expect(teamNameKey(`N/A ${NO_ENTRY}`)).toBe("n/a");
    });
});
