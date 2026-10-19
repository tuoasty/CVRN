import {describe, expect, it} from "vitest";
import {buildSpecSnapshot} from "../buildSpecSnapshot";
import {DEFAULT_PLACEMENT_BONUS, type PlacementBonusConfig} from "../placementBonus";
import type {SpecWithRequirements} from "../../types";

type Req = {tier: "main" | "secondary"; stat: string; value: number | null};

function spec(name: string, stars: number, reqs: Req[], regionId = "r1"): SpecWithRequirements {
    return {
        id: `id-${name}`,
        name,
        stars,
        position: "OUT",
        height: 79,
        secondary_required: 0,
        is_vaulted: false,
        created_at: "",
        updated_at: "",
        requirements: reqs.map((r, i) => ({
            id: `${name}-${i}`,
            spec_id: `id-${name}`,
            region_id: regionId,
            tier: r.tier,
            stat_key: r.stat,
            min_value: r.value,
            created_at: "",
        })),
    };
}

const kills = (value: number | null): Req => ({tier: "main", stat: "kills_per_set", value});

function tiersByName(specs: SpecWithRequirements[]) {
    const built = buildSpecSnapshot(specs, DEFAULT_PLACEMENT_BONUS, "t");
    return Object.fromEntries(built.payload.specs.map(s => [s.name, s.main.map(r => r.tier)]));
}

describe("buildSpecSnapshot", () => {
    it("skips specs with any unset value and names them", () => {
        const built = buildSpecSnapshot(
            [
                spec("Leon", 5, [kills(6), {tier: "secondary", stat: "aces_per_set", value: null}]),
                spec("Ishikawa", 5, [kills(5.5)]),
                spec("Empty", 4, []),
            ],
            DEFAULT_PLACEMENT_BONUS,
            "t"
        );
        expect(built.payload.specs.map(s => s.name)).toEqual(["Ishikawa"]);
        expect(built.skippedSpecs).toEqual(["Leon"]);
        expect(built.emptySpecCount).toBe(1);
    });

    it("leaves skipped specs out of the tiering pool", () => {
        const base = [spec("A", 5, [kills(1)]), spec("B", 5, [kills(2)]), spec("C", 5, [kills(3)]), spec("D", 5, [kills(4)])];
        const withSkipped = [...base, spec("E", 5, [kills(100), {tier: "secondary", stat: "aces_per_set", value: null}])];
        expect(tiersByName(withSkipped)).toEqual(tiersByName(base));
    });

    it("carries the region's placement bonus config in the payload", () => {
        const custom: PlacementBonusConfig = {...DEFAULT_PLACEMENT_BONUS, upperFinalist: 0.4, outside: -0.2};
        const built = buildSpecSnapshot([spec("A", 5, [kills(1)])], custom, "t");
        expect(built.payload.placementBonus).toEqual(custom);
    });

    it("ranks tiers within the region only, so scaled regions tier identically", () => {
        const values = [3, 4, 5, 6, 7, 8];
        const na = values.map((v, i) => spec(`S${i}`, 5, [kills(v)], "na"));
        const eu = values.map((v, i) => spec(`S${i}`, 5, [kills(v * 0.5)], "eu"));
        const naTiers = tiersByName(na);
        expect(new Set(Object.values(naTiers).flat()).size).toBeGreaterThan(1);
        expect(tiersByName(eu)).toEqual(naTiers);
    });
});
