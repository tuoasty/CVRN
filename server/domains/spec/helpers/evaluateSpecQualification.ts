import {PlayerLeaderboardRow} from "@/server/domains/player";
import {SpecQualificationRow, SpecRequirementCheck, SpecTier} from "../types";
import {isSpecStatKey, isLowerIsBetterStatKey, isEfficiencyStatKey, PARTICIPATION_STAT_KEYS} from "../types/statKeys";
import {PlacementBonusConfig, resolvePlacementBonus} from "./placementBonus";

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

    const rows = players.map<SpecQualificationRow>(player => {
        const place = player.team_id ? (options.placeByTeamId?.get(player.team_id) ?? null) : null;
        const isUpperFinalist =
            player.team_id !== null && player.team_id === options.upperFinalistTeamId;
        const bonus = applyPlacement
            ? resolvePlacementBonus(options.bonusConfig as PlacementBonusConfig, place, isUpperFinalist)
            : 0;

        const checks = known.map(r => check(player, r, bonus));

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

    rows.sort((a, b) => {
        if (a.qualified !== b.qualified) return a.qualified ? -1 : 1;
        const shortfall = requirementShortfall(a) - requirementShortfall(b);
        if (shortfall !== 0) return shortfall;
        return a.username.localeCompare(b.username);
    });

    return {rows, unknownStatKeys};
}

function check(
    player: PlayerLeaderboardRow,
    r: EvaluableRequirement,
    bonus: number
): SpecRequirementCheck {
    const raw = player[r.statKey as keyof PlayerLeaderboardRow];

    const value = typeof raw === "number" ? raw : null;

    const lower = isLowerIsBetterStatKey(r.statKey);
    const scaled = PARTICIPATION_STAT_KEYS.has(r.statKey) || lower || isEfficiencyStatKey(r.statKey) ? 0 : bonus;
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

function requirementShortfall(row: SpecQualificationRow): number {
    const mainShort = row.mainTotal - row.mainPassed;
    const secondaryShort = Math.max(0, row.secondaryRequired - row.secondaryPassed);
    return mainShort + secondaryShort;
}
