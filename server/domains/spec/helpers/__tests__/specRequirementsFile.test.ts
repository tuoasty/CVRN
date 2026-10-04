import {describe, expect, it} from "vitest";
import {
    applyImportMode,
    buildSpecExport,
    diffSpecImport,
    specExportFilename,
    validateSpecImport,
} from "../specRequirementsFile";
import type {SpecFileRegion, SpecFileSpec} from "../../types/specFile";

const NA = "11111111-1111-1111-1111-111111111111";
const EU = "22222222-2222-2222-2222-222222222222";

const regions: SpecFileRegion[] = [
    {id: NA, code: "NA"},
    {id: EU, code: "EU"},
];

function makeSpecs(): SpecFileSpec[] {
    return [
        {
            id: "spec-leon",
            name: "Wilfredo Leon",
            stars: 5,
            position: "OUT",
            requirements: [
                {region_id: NA, tier: "main", stat_key: "kills_per_set", min_value: 6.5},
                {region_id: NA, tier: "secondary", stat_key: "aces_per_set", min_value: 0.4},
                {region_id: NA, tier: "secondary", stat_key: "hit_eff", min_value: 0.3},
                {region_id: EU, tier: "main", stat_key: "kills_per_set", min_value: 5},
            ],
            rules: [
                {region_id: NA, secondary_required: 1},
                {region_id: EU, secondary_required: 0},
            ],
        },
        {
            id: "spec-ishikawa",
            name: "Yuki Ishikawa",
            stars: 4,
            position: "OUT",
            requirements: [{region_id: NA, tier: "main", stat_key: "digs_per_set", min_value: 3}],
            rules: [{region_id: NA, secondary_required: 0}],
        },
        {
            id: "spec-empty",
            name: "Empty Spec",
            stars: 3,
            position: "MID",
            requirements: [],
            rules: [],
        },
    ];
}

function validEntry(overrides: Record<string, unknown> = {}) {
    return {
        spec_name: "Wilfredo Leon",
        stars: 5,
        position: "OUT",
        secondary_required: 1,
        main_reqs: {kills_per_set: 6},
        sub_reqs: {aces_per_set: 0.5, hit_eff: null},
        ...overrides,
    };
}

function fileWith(entries: unknown[]) {
    return {version: 1, exportedAt: "2026-10-03T00:00:00Z", specs: entries};
}

function issuesOf(file: unknown, specs = makeSpecs()) {
    const res = validateSpecImport(file, {specs});
    if (res.ok) throw new Error("expected rejection");
    return res.issues.map(i => i.message);
}

describe("buildSpecExport", () => {
    it("writes the selected region as a region-agnostic spec list, skipping specs with no reqs there", () => {
        const file = buildSpecExport({
            specs: makeSpecs(),
            regionId: NA,
            exportedAt: "2026-10-03T00:00:00Z",
        });
        expect(Object.keys(file)).toEqual(["version", "exportedAt", "specs"]);
        expect(file.specs.map(e => e.spec_name)).toEqual(["Wilfredo Leon", "Yuki Ishikawa"]);
        expect(file.specs[0]).toEqual({
            spec_name: "Wilfredo Leon",
            stars: 5,
            position: "OUT",
            secondary_required: 1,
            main_reqs: {kills_per_set: 6.5},
            sub_reqs: {hit_eff: 0.3, aces_per_set: 0.4},
        });
    });

    it("only reads the requested region", () => {
        const file = buildSpecExport({specs: makeSpecs(), regionId: EU, exportedAt: "x"});
        expect(file.specs).toEqual([
            {
                spec_name: "Wilfredo Leon",
                stars: 5,
                position: "OUT",
                secondary_required: 0,
                main_reqs: {kills_per_set: 5},
                sub_reqs: {},
            },
        ]);
    });

    it("always carries the region's values, including unset ones", () => {
        const specs = makeSpecs();
        specs[0].requirements[1] = {...specs[0].requirements[1], min_value: null};
        const file = buildSpecExport({specs, regionId: NA, exportedAt: "x"});
        expect(file.specs[0].sub_reqs).toEqual({hit_eff: 0.3, aces_per_set: null});
        expect(file.specs[0].main_reqs).toEqual({kills_per_set: 6.5});
    });

    it("builds the filename from the source region code and the date", () => {
        const date = new Date("2026-10-03T12:00:00Z");
        expect(specExportFilename("NA", date)).toBe("cvrn-spec-reqs-na-20261003.json");
        expect(specExportFilename("EU", date)).toBe("cvrn-spec-reqs-eu-20261003.json");
    });
});

describe("validateSpecImport", () => {
    it("accepts a valid file with null values", () => {
        const res = validateSpecImport(fileWith([validEntry()]), {specs: makeSpecs()});
        expect(res.ok).toBe(true);
        if (!res.ok) return;
        expect(res.specs[0].requirements).toEqual([
            {tier: "main", statKey: "kills_per_set", minValue: 6},
            {tier: "secondary", statKey: "hit_eff", minValue: null},
            {tier: "secondary", statKey: "aces_per_set", minValue: 0.5},
        ]);
    });

    it("rejects an unknown spec", () => {
        expect(issuesOf(fileWith([validEntry({spec_name: "Nobody"})]))).toEqual(['Unknown spec "Nobody"']);
    });

    it("rejects a stars or position mismatch", () => {
        const messages = issuesOf(fileWith([validEntry({stars: 4, position: "OPP"})]));
        expect(messages).toHaveLength(2);
        expect(messages[0]).toMatch(/Stars 4/);
        expect(messages[1]).toMatch(/Position OPP/);
    });

    it("rejects a stat listed in both main and sub", () => {
        const messages = issuesOf(
            fileWith([validEntry({main_reqs: {kills_per_set: 6}, sub_reqs: {kills_per_set: 5}, secondary_required: 0})])
        );
        expect(messages).toEqual(['Stat "kills_per_set" appears in both main_reqs and sub_reqs']);
    });

    it("rejects an unknown stat key", () => {
        const messages = issuesOf(fileWith([validEntry({main_reqs: {kils_per_set: 6}})]));
        expect(messages).toEqual(['Unknown stat "kils_per_set"']);
    });

    it("rejects secondary_required above the sub count", () => {
        const messages = issuesOf(fileWith([validEntry({secondary_required: 3})]));
        expect(messages).toHaveLength(1);
        expect(messages[0]).toMatch(/secondary_required 3 is more than the 2 sub_reqs/);
    });

    it("rejects a duplicate spec and an empty list", () => {
        expect(issuesOf(fileWith([validEntry(), validEntry()]))).toEqual(["Spec is listed more than once"]);
        expect(issuesOf(fileWith([]))).toEqual(["The file lists no specs"]);
    });

    it("rejects the old region-keyed format", () => {
        const messages = issuesOf({version: 1, regions: {na: [validEntry()]}});
        expect(messages.length).toBeGreaterThan(0);
    });

    it("collects every error instead of stopping at the first", () => {
        const messages = issuesOf(
            fileWith([
                validEntry({spec_name: "Nobody"}),
                validEntry({stars: 3}),
                validEntry({spec_name: "Yuki Ishikawa", stars: 4, main_reqs: {bogus: 1}, sub_reqs: {}, secondary_required: 1}),
            ])
        );
        expect(messages).toHaveLength(4);
    });

    it("rejects structurally broken files with paths", () => {
        const messages = issuesOf({version: 2, specs: [{spec_name: "Wilfredo Leon", main_reqs: {k: "six"}}]});
        expect(messages.length).toBeGreaterThan(0);
        expect(messages.some(m => m.startsWith("version"))).toBe(true);
    });
});

describe("export to import round trip", () => {
    it("re-imports an export into the same region as all unchanged", () => {
        const specs = makeSpecs();
        const file = buildSpecExport({specs, regionId: NA, exportedAt: "x"});
        const res = validateSpecImport(JSON.parse(JSON.stringify(file)), {specs});
        expect(res.ok).toBe(true);
        if (!res.ok) return;

        for (const resolved of res.specs) {
            const spec = specs.find(s => s.id === resolved.specId)!;
            const original = spec.requirements
                .filter(r => r.region_id === NA)
                .map(r => ({tier: r.tier, statKey: r.stat_key, minValue: r.min_value}));
            expect([...resolved.requirements].sort((a, b) => a.statKey.localeCompare(b.statKey))).toEqual(
                original.sort((a, b) => a.statKey.localeCompare(b.statKey))
            );
        }

        const diff = diffSpecImport(regions[0], res.specs, specs);
        expect(diff.specs.every(s => s.status === "unchanged")).toBe(true);
    });

    it("full import of an NA export into EU writes NA's values", () => {
        const specs = makeSpecs();
        const file = buildSpecExport({specs, regionId: NA, exportedAt: "x"});
        const res = validateSpecImport(file, {specs});
        expect(res.ok).toBe(true);
        if (!res.ok) return;

        const incoming = applyImportMode(res.specs, "full", EU, specs);
        const diff = diffSpecImport(regions[1], incoming, specs, "full");
        expect(diff.mode).toBe("full");
        expect(diff.unsetCount).toBe(0);
        const leon = diff.specs.find(s => s.specName === "Wilfredo Leon")!;
        expect(leon.status).toBe("changed");
        expect(leon.changes.find(c => c.statKey === "kills_per_set")).toEqual({
            statKey: "kills_per_set",
            before: {tier: "main", value: 5},
            after: {tier: "main", value: 6.5},
        });
    });

    it("shape import keeps the target's existing thresholds and adds new requirements as unset", () => {
        const specs = makeSpecs();
        const file = buildSpecExport({specs, regionId: NA, exportedAt: "x"});
        const res = validateSpecImport(file, {specs});
        expect(res.ok).toBe(true);
        if (!res.ok) return;

        const incoming = applyImportMode(res.specs, "shape", EU, specs);
        const leon = incoming.find(s => s.specName === "Wilfredo Leon")!;
        expect(leon.requirements).toEqual([
            {tier: "main", statKey: "kills_per_set", minValue: 5},
            {tier: "secondary", statKey: "hit_eff", minValue: null},
            {tier: "secondary", statKey: "aces_per_set", minValue: null},
        ]);
        expect(leon.secondaryRequired).toBe(1);

        const diff = diffSpecImport(regions[1], incoming, specs, "shape");
        expect(diff.mode).toBe("shape");
        expect(diff.unsetCount).toBe(3);
        const leonDiff = diff.specs.find(s => s.specName === "Wilfredo Leon")!;
        expect(leonDiff.changes.map(c => c.statKey)).toEqual(["hit_eff", "aces_per_set"]);
        const ishikawa = diff.specs.find(s => s.specName === "Yuki Ishikawa")!;
        expect(ishikawa.status).toBe("added");
        expect(ishikawa.changes).toEqual([
            {statKey: "digs_per_set", before: null, after: {tier: "main", value: null}},
        ]);
    });

    it("shape import into the source region changes nothing", () => {
        const specs = makeSpecs();
        const file = buildSpecExport({specs, regionId: NA, exportedAt: "x"});
        const res = validateSpecImport(file, {specs});
        expect(res.ok).toBe(true);
        if (!res.ok) return;
        const diff = diffSpecImport(regions[0], applyImportMode(res.specs, "shape", NA, specs), specs, "shape");
        expect(diff.specs.every(s => s.status === "unchanged")).toBe(true);
    });

    it("shape import removes target requirements the file does not list and moves tiers", () => {
        const specs = makeSpecs();
        const file = fileWith([
            {
                spec_name: "Wilfredo Leon",
                stars: 5,
                position: "OUT",
                secondary_required: 0,
                main_reqs: {},
                sub_reqs: {kills_per_set: 1, blocks_per_set: 2},
            },
        ]);
        const res = validateSpecImport(file, {specs});
        expect(res.ok).toBe(true);
        if (!res.ok) return;
        const incoming = applyImportMode(res.specs, "shape", NA, specs);
        expect(incoming[0].requirements).toEqual([
            {tier: "secondary", statKey: "kills_per_set", minValue: 6.5},
            {tier: "secondary", statKey: "blocks_per_set", minValue: null},
        ]);
        const diff = diffSpecImport(regions[0], incoming, specs, "shape");
        const removed = diff.specs[0].changes.filter(c => c.after === null).map(c => c.statKey);
        expect(removed.sort()).toEqual(["aces_per_set", "hit_eff"]);
    });

    it("marks a spec listed with empty objects as cleared", () => {
        const specs = makeSpecs();
        const file = fileWith([
            {spec_name: "Yuki Ishikawa", stars: 4, position: "OUT", secondary_required: 0, main_reqs: {}, sub_reqs: {}},
        ]);
        const res = validateSpecImport(file, {specs});
        expect(res.ok).toBe(true);
        if (!res.ok) return;
        const diff = diffSpecImport(regions[0], res.specs, specs);
        expect(diff.specs[0].status).toBe("cleared");
        expect(diff.counts.cleared).toBe(1);
    });
});
