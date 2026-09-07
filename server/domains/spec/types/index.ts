import {Spec, SpecRequirement} from "@/shared/types/db";

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

    place: number | null;
    isUpperFinalist: boolean;

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

export type {PlacementBonusConfig} from "../helpers/placementBonus";
export {
    DEFAULT_PLACEMENT_BONUS,
    PLACEMENT_LADDER_SIZE,
    resolvePlacementBonus,
    formatPlacementBonus,
} from "../helpers/placementBonus";

export type {SaveSpecInput, SpecRequirementInput, SpecQualificationInput} from "./schemas";
export {SaveSpecSchema, SpecRequirementSchema, SpecQualificationSchema} from "./schemas";
export {
    SPEC_STAT_KEYS,
    PARTICIPATION_STAT_KEYS,
    isSpecStatKey,
    isLowerIsBetterStatKey,
    specStatMeta,
    specStatLabel,
    specStatShort,
    formatSpecStatValue,
} from "./statKeys";
export type {SpecStatFormat, SpecStatKeyMeta} from "./statKeys";
export {SPEC_POSITIONS, positionLabel, formatHeight, parseHeight, parseHeightString} from "../helpers/positions";
export type {SpecPosition} from "../helpers/positions";
export type {
    SpecDifficultyTier,
    PublicRequirement,
    PublicParticipation,
    PublicSpec,
    SpecSnapshotPayload,
} from "./publicSnapshot";
