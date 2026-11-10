export const LVR_SCALE = 10;
export const LVR_SET_WEIGHT = 0.7;
export const LVR_POINT_WEIGHT = 0.3;
export const LVR_MAX_SET_DIFF = 2;
export const LVR_MAX_POINT_DIFF = 50;
export const FORFEIT_LVR = {forfeiter: -10, opponent: 5} as const;

export const WIN_POINTS = 2;
export const POINTS_PER_SET = 0.5;
export const FORFEIT_BONUS = 1;
export const FORFEIT_POINTS_WITHOUT_BONUS = 1;

export const DIFFERENTIAL_BONUS_TIERS: ReadonlyArray<{minDiff: number; bonus: number}> = [
    {minDiff: 30, bonus: 5},
    {minDiff: 25, bonus: 4},
    {minDiff: 20, bonus: 3},
    {minDiff: 15, bonus: 2},
    {minDiff: 10, bonus: 1},
    {minDiff: 5, bonus: 0.5},
];

export function differentialBonus(winnerPointDiff: number): number {
    return DIFFERENTIAL_BONUS_TIERS.find(t => winnerPointDiff >= t.minDiff)?.bonus ?? 0;
}
