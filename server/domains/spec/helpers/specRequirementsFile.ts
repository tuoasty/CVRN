import {SPEC_STAT_KEYS, isSpecStatKey} from "../types/statKeys";
import {SpecImportFileSchema} from "../types/schemas";
import {SPEC_POSITIONS} from "./positions";
import type {SpecTier} from "../types";
import type {
    ResolvedRequirement,
    ResolvedSpecImport,
    SpecDiffStatus,
    SpecExportFile,
    SpecFileEntry,
    SpecFileRegion,
    SpecFileReqMap,
    SpecFileSpec,
    SpecImportIssue,
    SpecImportMode,
    SpecImportRegionDiff,
    SpecImportSpecDiff,
    SpecStatChange,
} from "../types/specFile";

const STAT_ORDER = new Map<string, number>(SPEC_STAT_KEYS.map((m, i) => [m.key as string, i]));
const POS_ORDER = new Map<string, number>(SPEC_POSITIONS.map((p, i) => [p.code, i]));

function compareStatKeys(a: string, b: string): number {
    const oa = STAT_ORDER.get(a) ?? Number.MAX_SAFE_INTEGER;
    const ob = STAT_ORDER.get(b) ?? Number.MAX_SAFE_INTEGER;
    if (oa !== ob) return oa - ob;
    return a.localeCompare(b);
}

function compareSpecs(a: SpecFileSpec, b: SpecFileSpec): number {
    const pa = POS_ORDER.get(a.position) ?? 99;
    const pb = POS_ORDER.get(b.position) ?? 99;
    if (pa !== pb) return pa - pb;
    if (a.stars !== b.stars) return b.stars - a.stars;
    return a.name.localeCompare(b.name);
}

function toNumberOrNull(v: number | string | null): number | null {
    if (v === null) return null;
    const n = typeof v === "number" ? v : Number(v);
    return Number.isFinite(n) ? n : null;
}

function regionRequirements(spec: SpecFileSpec, regionId: string): ResolvedRequirement[] {
    return spec.requirements
        .filter(r => r.region_id === regionId)
        .map(r => ({
            tier: (r.tier === "main" ? "main" : "secondary") as SpecTier,
            statKey: r.stat_key,
            minValue: toNumberOrNull(r.min_value),
        }))
        .sort((a, b) => compareStatKeys(a.statKey, b.statKey));
}

function regionSecondary(spec: SpecFileSpec, regionId: string): number {
    return spec.rules.find(r => r.region_id === regionId)?.secondary_required ?? 0;
}

export function buildSpecExport(p: {
    specs: SpecFileSpec[];
    regionId: string;
    exportedAt: string;
}): SpecExportFile {
    const specs: SpecFileEntry[] = [];
    for (const spec of [...p.specs].sort(compareSpecs)) {
        const reqs = regionRequirements(spec, p.regionId);
        if (reqs.length === 0) continue;
        const main_reqs: SpecFileReqMap = {};
        const sub_reqs: SpecFileReqMap = {};
        for (const r of reqs) {
            const target = r.tier === "main" ? main_reqs : sub_reqs;
            target[r.statKey] = r.minValue;
        }
        specs.push({
            spec_name: spec.name,
            stars: spec.stars,
            position: spec.position,
            secondary_required: regionSecondary(spec, p.regionId),
            main_reqs,
            sub_reqs,
        });
    }

    return {version: 1, exportedAt: p.exportedAt, specs};
}

export function specExportFilename(regionCode: string, date: Date): string {
    const y = date.getUTCFullYear();
    const m = String(date.getUTCMonth() + 1).padStart(2, "0");
    const d = String(date.getUTCDate()).padStart(2, "0");
    return `cvrn-spec-reqs-${regionCode.trim().toLowerCase()}-${y}${m}${d}.json`;
}

export type SpecImportValidation =
    | {ok: true; specs: ResolvedSpecImport[]}
    | {ok: false; issues: SpecImportIssue[]};

export function validateSpecImport(file: unknown, ctx: {specs: SpecFileSpec[]}): SpecImportValidation {
    const parsed = SpecImportFileSchema.safeParse(file);
    if (!parsed.success) {
        return {
            ok: false,
            issues: parsed.error.issues.map(i => {
                const path = i.path.map(String);
                return {spec: null, message: path.length > 0 ? `${path.join(".")}: ${i.message}` : i.message};
            }),
        };
    }

    const issues: SpecImportIssue[] = [];
    const specByName = new Map(ctx.specs.map(s => [s.name, s]));
    const seenSpecs = new Set<string>();
    const resolved: ResolvedSpecImport[] = [];

    if (parsed.data.specs.length === 0) {
        issues.push({spec: null, message: "The file lists no specs"});
    }

    for (const entry of parsed.data.specs) {
        const name = entry.spec_name;
        const at = (message: string) => issues.push({spec: name, message});
        const before = issues.length;

        const spec = specByName.get(name);
        if (!spec) {
            at(`Unknown spec "${name}"`);
            continue;
        }
        if (seenSpecs.has(spec.id)) at("Spec is listed more than once");
        seenSpecs.add(spec.id);

        if (entry.stars !== spec.stars) {
            at(`Stars ${entry.stars} do not match the catalog (${spec.stars})`);
        }
        if (entry.position.toUpperCase() !== spec.position) {
            at(`Position ${entry.position} does not match the catalog (${spec.position})`);
        }

        const requirements: ResolvedRequirement[] = [];
        const tiers: [SpecTier, SpecFileReqMap][] = [
            ["main", entry.main_reqs],
            ["secondary", entry.sub_reqs],
        ];
        const seenStats = new Set<string>();
        for (const [tier, map] of tiers) {
            for (const [statKey, value] of Object.entries(map)) {
                if (!isSpecStatKey(statKey)) {
                    at(`Unknown stat "${statKey}"`);
                    continue;
                }
                if (seenStats.has(statKey)) {
                    at(`Stat "${statKey}" appears in both main_reqs and sub_reqs`);
                    continue;
                }
                seenStats.add(statKey);
                requirements.push({tier, statKey, minValue: value});
            }
        }

        const subCount = Object.keys(entry.sub_reqs).length;
        if (entry.secondary_required > subCount) {
            at(`secondary_required ${entry.secondary_required} is more than the ${subCount} sub_reqs, so nobody could qualify`);
        }

        if (issues.length === before) {
            resolved.push({
                specId: spec.id,
                specName: spec.name,
                secondaryRequired: entry.secondary_required,
                requirements: requirements.sort((a, b) => compareStatKeys(a.statKey, b.statKey)),
            });
        }
    }

    if (issues.length > 0) return {ok: false, issues};
    return {ok: true, specs: resolved};
}

export function applyImportMode(
    incoming: ResolvedSpecImport[],
    mode: SpecImportMode,
    regionId: string,
    specs: SpecFileSpec[]
): ResolvedSpecImport[] {
    if (mode === "full") return incoming;
    const specById = new Map(specs.map(s => [s.id, s]));

    return incoming.map(spec => {
        const current = specById.get(spec.specId);
        const existing = new Map(
            (current ? regionRequirements(current, regionId) : []).map(r => [r.statKey, r.minValue])
        );
        return {
            ...spec,
            requirements: spec.requirements.map(r => ({
                ...r,
                minValue: existing.has(r.statKey) ? (existing.get(r.statKey) ?? null) : null,
            })),
        };
    });
}

export function diffSpecImport(
    region: SpecFileRegion,
    incomingSpecs: ResolvedSpecImport[],
    specs: SpecFileSpec[],
    mode: SpecImportMode = "full"
): SpecImportRegionDiff {
    const specById = new Map(specs.map(s => [s.id, s]));

    const counts: Record<SpecDiffStatus, number> = {added: 0, changed: 0, cleared: 0, unchanged: 0};
    let regionUnset = 0;

    const specDiffs = incomingSpecs.map<SpecImportSpecDiff>(incoming => {
        const current = specById.get(incoming.specId);
        const beforeReqs = current ? regionRequirements(current, region.id) : [];
        const secondaryBefore = current ? regionSecondary(current, region.id) : 0;

        const beforeByKey = new Map(beforeReqs.map(r => [r.statKey, r]));
        const afterByKey = new Map(incoming.requirements.map(r => [r.statKey, r]));
        const keys = [...new Set([...beforeByKey.keys(), ...afterByKey.keys()])].sort(compareStatKeys);

        const changes: SpecStatChange[] = [];
        for (const key of keys) {
            const b = beforeByKey.get(key);
            const a = afterByKey.get(key);
            if (b && a && b.tier === a.tier && b.minValue === a.minValue) continue;
            changes.push({
                statKey: key,
                before: b ? {tier: b.tier, value: b.minValue} : null,
                after: a ? {tier: a.tier, value: a.minValue} : null,
            });
        }

        const unsetCount = incoming.requirements.filter(r => r.minValue === null).length;
        regionUnset += unsetCount;

        let status: SpecDiffStatus;
        if (changes.length === 0 && secondaryBefore === incoming.secondaryRequired) status = "unchanged";
        else if (beforeReqs.length === 0 && incoming.requirements.length > 0) status = "added";
        else if (beforeReqs.length > 0 && incoming.requirements.length === 0) status = "cleared";
        else status = "changed";
        counts[status] += 1;

        return {
            specId: incoming.specId,
            specName: incoming.specName,
            status,
            secondaryBefore,
            secondaryAfter: incoming.secondaryRequired,
            changes,
            unsetCount,
        };
    });

    return {
        regionId: region.id,
        regionCode: region.code,
        mode,
        specs: specDiffs,
        counts,
        unsetCount: regionUnset,
    };
}
