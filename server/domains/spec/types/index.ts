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

    setsPlayed: number;

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

export interface SpecWinnerWithRefs {
    id: string;
    season_id: string;
    spec_id: string;
    player_id: string;
    stars_awarded: number;
    created_at: string;
    updated_at: string;
    spec: {id: string; name: string; stars: number; position: string};
    player: {id: string; username: string; display_name: string | null; avatar_url: string | null};
}

export type {PlacementBonusConfig, BonusScope} from "../helpers/placementBonus";
export {
    DEFAULT_PLACEMENT_BONUS,
    DEFAULT_BONUS_SCOPE,
    PLACEMENT_LADDER_SIZE,
    resolvePlacementBonus,
    formatPlacementBonus,
} from "../helpers/placementBonus";

export type {SaveSpecInput, SpecRequirementInput, SpecQualificationInput, SavePlacementBonusInput, AwardSpecWinnerInput, DeleteSpecWinnerInput} from "./schemas";
export {SaveSpecSchema, SpecRequirementSchema, SpecQualificationSchema, SavePlacementBonusSchema, PlacementBonusConfigSchema, AwardSpecWinnerSchema, DeleteSpecWinnerSchema} from "./schemas";
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
