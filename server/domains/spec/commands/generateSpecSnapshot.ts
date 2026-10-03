import {DBClient} from "@/shared/types/db";
import {Ok, Result} from "@/shared/types/result";
import {findSpecsWithRequirements} from "@/server/db/specs.repo";
import {upsertSpecSnapshot} from "@/server/db/specSnapshot.repo";
import {
    PARTICIPATION_STAT_KEYS,
    isSpecStatKey,
    isLowerIsBetterStatKey,
    specStatLabel,
    SPEC_POSITIONS,
} from "../types";
import type {
    SpecSnapshotPayload,
    PublicSpec,
    PublicRequirement,
    PublicParticipation,
} from "../types";
import {SETS_FLOOR_BY_STAR, TIER_COUNT, tierForRequirement} from "../helpers/maskRequirement";

const ERRORS_PHRASE = "Low errors per set";

function isTieredSkillKey(statKey: string): boolean {
    return (
        isSpecStatKey(statKey) &&
        !PARTICIPATION_STAT_KEYS.has(statKey) &&
        !isLowerIsBetterStatKey(statKey)
    );
}

export async function generateSpecSnapshot(
    supabase: DBClient,
    regionId: string
): Promise<Result<{specCount: number; statCount: number}>> {
    const specsResult = await findSpecsWithRequirements(supabase, regionId);
    if (!specsResult.ok) return specsResult;
    const allSpecs = specsResult.value;

    const valuesByStat = new Map<string, number[]>();
    for (const spec of allSpecs) {
        for (const req of spec.requirements) {
            if (!isTieredSkillKey(req.stat_key) || req.min_value === null) continue;
            const arr = valuesByStat.get(req.stat_key);
            if (arr) arr.push(req.min_value);
            else valuesByStat.set(req.stat_key, [req.min_value]);
        }
    }

    const posOrder = new Map<string, number>(SPEC_POSITIONS.map((p, i) => [p.code, i]));

    const specs: PublicSpec[] = allSpecs.map(spec => {
        const participation: PublicParticipation[] = [];
        const main: PublicRequirement[] = [];
        const secondary: PublicRequirement[] = [];

        for (const req of spec.requirements) {
            if (req.min_value === null) continue;
            const statKey = req.stat_key;
            const bucket = req.tier === "main" ? main : secondary;

            if (PARTICIPATION_STAT_KEYS.has(statKey)) {
                participation.push({statKey, label: specStatLabel(statKey), value: req.min_value});
                continue;
            }
            if (!isSpecStatKey(statKey)) continue;
            if (isLowerIsBetterStatKey(statKey)) {
                bucket.push({statKey, label: ERRORS_PHRASE, tier: null});
                continue;
            }

            const values = valuesByStat.get(statKey) ?? [];
            bucket.push({
                statKey,
                label: specStatLabel(statKey),
                tier: tierForRequirement(req.min_value, values),
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

    const payload: SpecSnapshotPayload = {
        generatedAt: new Date().toISOString(),
        tierCount: TIER_COUNT,
        setsFloorByStar: SETS_FLOOR_BY_STAR,
        specs,
    };

    const statCount = valuesByStat.size;
    const upsert = await upsertSpecSnapshot(supabase, {regionId, payload, poolSize: statCount});
    if (!upsert.ok) return upsert;

    return Ok({specCount: specs.length, statCount});
}
