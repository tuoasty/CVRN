import {PlayerLeaderboardRow} from "@/server/domains/player";
import {SpecQualificationRow, SpecRequirementCheck, SpecTier} from "../types";
import {isSpecStatKey, PARTICIPATION_STAT_KEYS} from "../types/statKeys";
import {placementBonus, PlacementTier} from "./placementBonus";

export type EvaluableRequirement = {
    tier: SpecTier;
    statKey: string;
    minValue: number;
};

export type EvaluateOptions = {
    /** Star tier being tested. Drives the placement bonus curve. */
    stars?: number;
    /** team_id -> finals slot. Absent team = `outside`, which is most of the league. */
    tierByTeamId?: Map<string, PlacementTier>;
};

export type SpecEvaluation = {
    /** Qualified first, then nearest-miss first. */
    rows: SpecQualificationRow[];
    unknownStatKeys: string[];
};

/**
 * Runs a spec's thresholds against a season's players.
 *
 * Pure and synchronous so the admin calibration screen can re-run it on every
 * keystroke while thresholds are being dragged around. It takes loose
 * requirements rather than a saved spec for the same reason — the numbers being
 * tested usually are not the numbers in the database yet.
 */
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

    // No star tier means no placement rule is in play — the caller is evaluating a
    // bare threshold set, so stats stand unmodified.
    const applyPlacement = options.stars !== undefined;

    const rows = players.map<SpecQualificationRow>(player => {
        const placementTier: PlacementTier = player.team_id
            ? (options.tierByTeamId?.get(player.team_id) ?? "outside")
            : "outside";
        const bonus = applyPlacement ? placementBonus(placementTier, options.stars as number) : 0;

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
            placementTier,
            placementBonus: bonus,
            // An unresolvable stat key disqualifies everyone rather than being skipped.
            // Skipping it would quietly relax the spec, and a spec that is easier than
            // written is a worse failure than one that qualifies nobody.
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

    // Null fails, always. Every stat column on the view is nullable — hit_eff is null
    // when a player took no attempts — and `null >= 0` is true in JS, so comparing
    // without this guard would pass every zero-attempt player on a 0 threshold.
    const value = typeof raw === "number" ? raw : null;

    // Sets and matches played are sample-size floors, not performance. Finishing
    // first does not mean a player appeared in more sets, so the bonus skips them.
    const scaled = PARTICIPATION_STAT_KEYS.has(r.statKey) ? 0 : bonus;
    const adjusted = value === null ? null : value * (1 + scaled);

    return {
        statKey: r.statKey,
        tier: r.tier,
        minValue: r.minValue,
        value,
        adjustedValue: adjusted,
        passed: adjusted !== null && adjusted >= r.minValue,
    };
}

/** How many requirements a player is short by. Drives near-miss ordering. */
function requirementShortfall(row: SpecQualificationRow): number {
    const mainShort = row.mainTotal - row.mainPassed;
    const secondaryShort = Math.max(0, row.secondaryRequired - row.secondaryPassed);
    return mainShort + secondaryShort;
}
