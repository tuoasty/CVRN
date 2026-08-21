import {describe, expect, it} from "vitest";
import {SPEC_POSITIONS, positionLabel, formatHeight, parseHeight, parseHeightString} from "../positions";

describe("positions helper", () => {
    it("exposes the five positions in a fixed order", () => {
        expect(SPEC_POSITIONS.map(p => p.code)).toEqual(["OUT", "OPP", "MID", "SET", "LIB"]);
    });

    it("labels a known code and echoes an unknown one", () => {
        expect(positionLabel("SET")).toBe("Setter");
        expect(positionLabel("XX")).toBe("XX");
    });

    it("formats inches as feet and inches", () => {
        expect(formatHeight(82)).toBe("6'10\"");
        expect(formatHeight(72)).toBe("6'0\"");
        expect(formatHeight(68)).toBe("5'8\"");
    });

    it("parses feet + inches back to total inches", () => {
        expect(parseHeight(6, 10)).toBe(82);
        expect(parseHeight(5, 8)).toBe(68);
    });

    it("parses a height string in several shapes", () => {
        expect(parseHeightString("6'7\"")).toBe(79);
        expect(parseHeightString("6'7")).toBe(79);
        expect(parseHeightString("6'")).toBe(72);
        expect(parseHeightString(" 5'8 ")).toBe(68);
    });

    it("rejects a malformed height string", () => {
        expect(parseHeightString("tall")).toBeNull();
        expect(parseHeightString("6'13")).toBeNull();
    });
});
