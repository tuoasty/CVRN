import {PlayerLeaderboardRow} from "@/server/domains/player";
import {SpecQualificationRow, SpecRequirementCheck, SpecTier} from "../types";
import {isSpecStatKey, isLowerIsBetterStatKey, specStatMeta, PARTICIPATION_STAT_KEYS} from "../types/statKeys";
import {BonusScope, DEFAULT_BONUS_SCOPE, PlacementBonusConfig, resolvePlacementBonus} from "./placementBonus";

export type EvaluableRequirement = {
    tier: SpecTier;
    statKey: string;
    minValue: number;
};

export type EvaluateOptions = {
    bonusConfig?: PlacementBonusConfig;
    placeByTeamId?: Map<string, number>;
    upperFinalistTeamId?: string | null;
};

export type SpecEvaluation = {

    rows: SpecQualificationRow[];
    unknownStatKeys: string[];
};

export function evaluateSpecQualification(
    players: PlayerLeaderboardRow[],
    requirements: EvaluableRequirement[],
    secondaryRequired: number,
    options: EvaluateOptions = {}
): SpecEvaluation {
    const unknownStatKeys = requirements.filter(r => !isSpecStatKey(r.statKey)).map(r => r.statKey);
    const known = requirements.filter(r => isSpecStatKey(r.statKey));

    const main = known.filter(r => r.tier === "main");
    const secondary = known.filter(r => r.tier === "secondary");

    const applyPlacement = options.bonusConfig !== undefined;
    const scope = options.bonusConfig?.scope ?? DEFAULT_BONUS_SCOPE;

    const rows = players.map<SpecQualificationRow>(player => {
        const place = player.team_id ? (options.placeByTeamId?.get(player.team_id) ?? null) : null;
        const isUpperFinalist =
            player.team_id !== null && player.team_id === options.upperFinalistTeamId;
        const bonus = applyPlacement
            ? resolvePlacementBonus(options.bonusConfig as PlacementBonusConfig, place, isUpperFinalist)
            : 0;

        const checks = known.map(r => check(player, r, bonus, scope));

        const mainPassed = checks.filter(c => c.tier === "main" && c.passed).length;
        const secondaryPassed = checks.filter(c => c.tier === "secondary" && c.passed).length;

        return {
            playerId: player.player_id,
            username: player.username,
            displayName: player.display_name,
            avatarUrl: player.avatar_url,
            teamName: player.team_name,
            teamSlug: player.team_slug,
            teamLogoUrl: player.team_logo_url,
            teamLogoBgRemoved: player.team_logo_bg_removed,
            place,
            isUpperFinalist,
            placementBonus: bonus,

            qualified:
                unknownStatKeys.length === 0 &&
                mainPassed === main.length &&
                secondaryPassed >= secondaryRequired,
            mainPassed,
            mainTotal: main.length,
            secondaryPassed,
            secondaryTotal: secondary.length,
            secondaryRequired,
            checks,
        };
    });

    const proximity = new Map<string, {bottleneck: number; mean: number}>();
    for (const row of rows) proximity.set(row.playerId, qualificationProximity(row));

    rows.sort((a, b) => {
        if (a.qualified !== b.qualified) return a.qualified ? -1 : 1;
        const pa = proximity.get(a.playerId)!;
        const pb = proximity.get(b.playerId)!;
        if (pb.bottleneck !== pa.bottleneck) return pb.bottleneck - pa.bottleneck;
        if (pb.mean !== pa.mean) return pb.mean - pa.mean;
        return a.username.localeCompare(b.username);
    });

    return {rows, unknownStatKeys};
}

function check(
    player: PlayerLeaderboardRow,
    r: EvaluableRequirement,
    bonus: number,
    scope: BonusScope
): SpecRequirementCheck {
    const raw = player[r.statKey as keyof PlayerLeaderboardRow];

    const value = typeof raw === "number" ? raw : null;

    const lower = isLowerIsBetterStatKey(r.statKey);
    const format = specStatMeta(r.statKey)?.format ?? "count";
    const scalable = scope[format] && !PARTICIPATION_STAT_KEYS.has(r.statKey) && !lower;
    const scaled = scalable ? bonus : 0;
    const adjusted = value === null ? null : value * (1 + scaled);

    return {
        statKey: r.statKey,
        tier: r.tier,
        minValue: r.minValue,
        value,
        adjustedValue: adjusted,
        passed: adjusted !== null && (lower ? adjusted <= r.minValue : adjusted >= r.minValue),
    };
}

function checkRatio(c: SpecRequirementCheck): number {
    if (c.adjustedValue === null) return 0;
    const lower = isLowerIsBetterStatKey(c.statKey);
    if (lower) {
        if (c.adjustedValue <= c.minValue) return 1;
        if (c.adjustedValue <= 0 || c.minValue <= 0) return 0;
        return Math.min(c.minValue / c.adjustedValue, 1);
    }
    if (c.minValue <= 0) return 1;
    return Math.max(0, Math.min(c.adjustedValue / c.minValue, 1));
}

function qualificationProximity(row: SpecQualificationRow): {bottleneck: number; mean: number} {
    const mainRatios = row.checks.filter(c => c.tier === "main").map(checkRatio);
    const secRatios = row.checks.filter(c => c.tier === "secondary").map(checkRatio).sort((a, b) => b - a);

    const mainBottleneck = mainRatios.length ? Math.min(...mainRatios) : 1;
    const secondaryScore = row.secondaryRequired <= 0 ? 1 : (secRatios[row.secondaryRequired - 1] ?? 0);
    const bottleneck = Math.min(mainBottleneck, secondaryScore);

    const all = [...mainRatios, ...secRatios];
    const mean = all.length ? all.reduce((s, r) => s + r, 0) / all.length : 1;
    return {bottleneck, mean};
}
