import {Spec, SpecRequirement} from "@/shared/types/db";

export type SpecTier = "main" | "secondary";

export interface SpecWithRequirements extends Spec {
    requirements: SpecRequirement[];
}

/** One requirement evaluated against one player. */
export interface SpecRequirementCheck {
    statKey: string;
    tier: SpecTier;
    minValue: number;
    /** The player's raw value. Null when the view has no value — always a fail. */
    value: number | null;
    /** `value` after the placement bonus. What `passed` is actually judged on. */
    adjustedValue: number | null;
    passed: boolean;
}

export interface SpecQualificationRow {
    playerId: string;
    username: string;
    displayName: string | null;
    avatarUrl: string | null;
    teamName: string | null;
    teamSlug: string | null;
    teamLogoUrl: string | null;
    teamLogoBgRemoved: boolean | null;
    /** Podium place 1-3, or null for a team that finished off the podium. */
    placement: number | null;
    /** Multiplier offset applied to this player's stats, e.g. 0.15 or -0.1. */
    placementBonus: number;
    qualified: boolean;
    mainPassed: number;
    mainTotal: number;
    secondaryPassed: number;
    secondaryTotal: number;
    secondaryRequired: number;
    checks: SpecRequirementCheck[];
}

export interface SpecQualification {
    spec: SpecWithRequirements;
    /** Qualified first, then by how close they came. */
    rows: SpecQualificationRow[];
    /**
     * Requirement stat_keys that are not in SPEC_STAT_KEYS. Surfaced rather than
     * skipped: a key that matches nothing would otherwise silently pass everyone.
     */
    unknownStatKeys: string[];
}

export type {SaveSpecInput, SpecRequirementInput, SpecQualificationInput} from "./schemas";
export {SaveSpecSchema, SpecRequirementSchema, SpecQualificationSchema} from "./schemas";
export {
    SPEC_STAT_KEYS,
    PARTICIPATION_STAT_KEYS,
    isSpecStatKey,
    specStatMeta,
    specStatLabel,
    specStatShort,
    formatSpecStatValue,
} from "./statKeys";
export type {SpecStatFormat, SpecStatKeyMeta} from "./statKeys";
