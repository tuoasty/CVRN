import {Spec, SpecRequirement} from "@/shared/types/db";
import type {PlacementTier} from "../helpers/placementBonus";

export type SpecTier = "main" | "secondary";

export interface SpecWithRequirements extends Spec {
    requirements: SpecRequirement[];
}

export interface SpecRequirementCheck {
    statKey: string;
    tier: SpecTier;
    minValue: number;

    value: number | null;

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

    placementTier: PlacementTier;

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

    rows: SpecQualificationRow[];

    unknownStatKeys: string[];
}

export type {PlacementTier} from "../helpers/placementBonus";
export {
    placementBonus,
    placementTiersFromSlots,
    formatPlacementBonus,
    PLACEMENT_TIER_LABEL,
} from "../helpers/placementBonus";

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
