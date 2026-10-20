import {
    PARTICIPATION_STAT_KEYS,
    isSpecStatKey,
    isLowerIsBetterStatKey,
    specStatLabel,
} from "../types/statKeys";
import {SPEC_POSITIONS} from "./positions";
import {SETS_FLOOR_BY_STAR, TIER_COUNT, tierForRequirement} from "./maskRequirement";
import type {PlacementBonusConfig} from "./placementBonus";
import {DEFAULT_HEIGHT_RANGE_BY_STAR, type HeightRangeByStar} from "./heightRange";
import type {SpecWithRequirements} from "../types";
import type {
    PublicParticipation,
    PublicRequirement,
    PublicSpec,
    SpecSnapshotPayload,
} from "../types/publicSnapshot";

const ERRORS_PHRASE = "Low errors per set";

function isTieredSkillKey(statKey: string): boolean {
    return (
        isSpecStatKey(statKey) &&
        !PARTICIPATION_STAT_KEYS.has(statKey) &&
        !isLowerIsBetterStatKey(statKey)
    );
}

export type SpecSnapshotBuild = {
    payload: SpecSnapshotPayload;
    skippedSpecs: string[];
    emptySpecCount: number;
    statCount: number;
};

export function buildSpecSnapshot(
    allSpecs: SpecWithRequirements[],
    placementBonus: PlacementBonusConfig,
    generatedAt: string,
    heightRangeByStar: HeightRangeByStar = DEFAULT_HEIGHT_RANGE_BY_STAR
): SpecSnapshotBuild {
    const skippedSpecs: string[] = [];
    let emptySpecCount = 0;
    const publishable: SpecWithRequirements[] = [];

    for (const spec of allSpecs) {
        if (spec.requirements.length === 0) {
            emptySpecCount += 1;
            continue;
        }
        if (spec.requirements.some(r => r.min_value === null)) {
            skippedSpecs.push(spec.name);
            continue;
        }
        publishable.push(spec);
    }

    const valuesByStat = new Map<string, number[]>();
    for (const spec of publishable) {
        for (const req of spec.requirements) {
            if (!isTieredSkillKey(req.stat_key) || req.min_value === null) continue;
            const value = Number(req.min_value);
            const arr = valuesByStat.get(req.stat_key);
            if (arr) arr.push(value);
            else valuesByStat.set(req.stat_key, [value]);
        }
    }

    const posOrder = new Map<string, number>(SPEC_POSITIONS.map((p, i) => [p.code, i]));

    const specs: PublicSpec[] = publishable.map(spec => {
        const participation: PublicParticipation[] = [];
        const main: PublicRequirement[] = [];
        const secondary: PublicRequirement[] = [];

        for (const req of spec.requirements) {
            if (req.min_value === null) continue;
            const value = Number(req.min_value);
            const statKey = req.stat_key;
            const bucket = req.tier === "main" ? main : secondary;

            if (PARTICIPATION_STAT_KEYS.has(statKey)) {
                participation.push({statKey, label: specStatLabel(statKey), value});
                continue;
            }
            if (!isSpecStatKey(statKey)) continue;
            if (isLowerIsBetterStatKey(statKey)) {
                bucket.push({statKey, label: ERRORS_PHRASE, tier: null});
                continue;
            }

            bucket.push({
                statKey,
                label: specStatLabel(statKey),
                tier: tierForRequirement(value, valuesByStat.get(statKey) ?? []),
            });
        }

        return {
            id: spec.id,
            name: spec.name,
            position: spec.position,
            heightInches: spec.height,
            stars: spec.stars,
            secondaryRequired: spec.secondary_required,
            participation,
            main,
            secondary,
        };
    });

    specs.sort((a, b) => {
        const pa = posOrder.get(a.position) ?? 99;
        const pb = posOrder.get(b.position) ?? 99;
        if (pa !== pb) return pa - pb;
        if (a.stars !== b.stars) return b.stars - a.stars;
        return a.name.localeCompare(b.name);
    });

    return {
        payload: {
            generatedAt,
            tierCount: TIER_COUNT,
            setsFloorByStar: SETS_FLOOR_BY_STAR,
            placementBonus,
            heightRangeByStar,
            specs,
        },
        skippedSpecs: skippedSpecs.sort((a, b) => a.localeCompare(b)),
        emptySpecCount,
        statCount: valuesByStat.size,
    };
}
