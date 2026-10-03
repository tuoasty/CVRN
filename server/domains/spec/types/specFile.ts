import type {SpecTier} from "./index";

export type SpecFileReqMap = Record<string, number | null>;

export interface SpecFileEntry {
    spec_name: string;
    stars: number;
    position: string;
    secondary_required: number;
    main_reqs: SpecFileReqMap;
    sub_reqs: SpecFileReqMap;
}

export interface SpecExportFile {
    version: 1;
    exportedAt: string;
    specs: SpecFileEntry[];
}

export interface SpecImportIssue {
    spec: string | null;
    message: string;
}

export interface SpecFileRegion {
    id: string;
    code: string;
}

export interface SpecFileSpec {
    id: string;
    name: string;
    stars: number;
    position: string;
    requirements: {region_id: string; tier: string; stat_key: string; min_value: number | null}[];
    rules: {region_id: string; secondary_required: number}[];
}

export interface ResolvedRequirement {
    tier: SpecTier;
    statKey: string;
    minValue: number | null;
}

export interface ResolvedSpecImport {
    specId: string;
    specName: string;
    secondaryRequired: number;
    requirements: ResolvedRequirement[];
}

export type SpecImportMode = "full" | "shape";

export type SpecDiffStatus = "added" | "changed" | "cleared" | "unchanged";

export interface SpecStatChange {
    statKey: string;
    before: {tier: SpecTier; value: number | null} | null;
    after: {tier: SpecTier; value: number | null} | null;
}

export interface SpecImportSpecDiff {
    specId: string;
    specName: string;
    status: SpecDiffStatus;
    secondaryBefore: number;
    secondaryAfter: number;
    changes: SpecStatChange[];
    unsetCount: number;
}

export interface SpecImportRegionDiff {
    regionId: string;
    regionCode: string;
    mode: SpecImportMode;
    specs: SpecImportSpecDiff[];
    counts: Record<SpecDiffStatus, number>;
    unsetCount: number;
}

export type SpecImportResult =
    | {status: "rejected"; issues: SpecImportIssue[]}
    | {status: "preview"; diff: SpecImportRegionDiff}
    | {status: "applied"; diff: SpecImportRegionDiff};
