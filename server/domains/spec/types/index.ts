import {Spec, SpecRegionRule, SpecRequirement} from "@/shared/types/db";
import type {LeagueFields} from "../helpers/league";

export type SpecTier = "main" | "secondary";

export type LeagueSpec = Spec & LeagueFields;

export type SpecWithRequirements = LeagueSpec & {
    requirements: SpecRequirement[];
};

export interface SpecWithAllRegions extends Spec {
    requirements: SpecRequirement[];
    rules: SpecRegionRule[];
}

export type LeagueSpecWithAllRegions = SpecWithAllRegions & LeagueFields;

export interface SpecRequirementCheck {
    statKey: string;
    tier: SpecTier;
    minValue: number | null;

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
export type {HeightRangeByStar} from "../helpers/heightRange";
export {HEIGHT_RANGE_STARS, DEFAULT_HEIGHT_RANGE_BY_STAR, heightRangeFor} from "../helpers/heightRange";
export {
    DEFAULT_PLACEMENT_BONUS,
    DEFAULT_BONUS_SCOPE,
    PLACEMENT_LADDER_SIZE,
    resolvePlacementBonus,
    formatPlacementBonus,
} from "../helpers/placementBonus";

export type {ExportSpecRequirementsInput, ImportSpecRequirementsInput, SaveSpecIdentityInput, SetSpecVaultedInput, SaveSpecFactsInput, RegionSpecRequirementsInput, SaveRegionRequirementsInput, SpecPositionInput, SpecRequirementInput, SpecQualificationInput, SavePlacementBonusInput, SaveHeightRangesInput, AwardSpecWinnerInput, DeleteSpecWinnerInput} from "./schemas";
export {SpecImportFileSchema, SpecFileEntrySchema, ExportSpecRequirementsSchema, ImportSpecRequirementsSchema, SaveSpecIdentitySchema, SetSpecVaultedSchema, SaveSpecFactsSchema, RegionSpecRequirementsSchema, SaveRegionRequirementsSchema, SpecPositionSchema, SpecRequirementSchema, SpecQualificationSchema, SavePlacementBonusSchema, SaveHeightRangesSchema, PlacementBonusConfigSchema, AwardSpecWinnerSchema, DeleteSpecWinnerSchema} from "./schemas";

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
export {isLeagueSpec} from "../helpers/league";
export type {LeagueFields} from "../helpers/league";
export {SPEC_POSITIONS, positionLabel, formatHeight, parseHeight, parseHeightString} from "../helpers/positions";
export type {SpecPosition} from "../helpers/positions";
export type {
    SpecDifficultyTier,
    PublicRequirement,
    PublicParticipation,
    PublicSpec,
    SpecSnapshotPayload,
    PublishedSpecRegion,
} from "./publicSnapshot";
export type {
    SpecFileReqMap,
    SpecFileEntry,
    SpecExportFile,
    SpecImportIssue,
    SpecFileRegion,
    SpecFileSpec,
    ResolvedRequirement,
    ResolvedSpecImport,
    SpecDiffStatus,
    SpecImportMode,
    SpecStatChange,
    SpecImportSpecDiff,
    SpecImportRegionDiff,
    SpecImportResult,
} from "./specFile";

export type {RecentWinnerPlayer, RecentWinnerRow, EndedSeason, RecentSpecWinners, RecentSpecWinnerEntry} from "./recentWinners";
