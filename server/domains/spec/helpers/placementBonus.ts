export interface BonusScope {
    count: boolean;
    per_set: boolean;
    pct: boolean;
}

export interface PlacementBonusConfig {
    upperFinalist: number;
    ladder: number[];
    outside: number;
    scope: BonusScope;
}

export const PLACEMENT_LADDER_SIZE = 8;

export const DEFAULT_BONUS_SCOPE: BonusScope = {
    count: true,
    per_set: false,
    pct: false,
};

export const DEFAULT_PLACEMENT_BONUS: PlacementBonusConfig = {
    upperFinalist: 0.25,
    ladder: [0.1, 0.075, 0.05, 0.025, 0, 0, 0, 0],
    outside: -0.1,
    scope: DEFAULT_BONUS_SCOPE,
};

export function resolvePlacementBonus(
    cfg: PlacementBonusConfig,
    place: number | null,
    isUpperFinalist: boolean
): number {
    const placed = place !== null && place >= 1 && place <= PLACEMENT_LADDER_SIZE;
    const base = placed ? (cfg.ladder[place - 1] ?? 0) : isUpperFinalist ? 0 : cfg.outside;
    return base + (isUpperFinalist ? cfg.upperFinalist : 0);
}

export function formatPlacementBonus(bonus: number): string {
    if (bonus === 0) return "—";
    const pct = Math.round(bonus * 1000) / 10;
    return bonus > 0 ? `+${pct}%` : `${pct}%`;
}
