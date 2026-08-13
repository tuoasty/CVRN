import {
    UPPER_FINALIST_BONUS,
    FIVE_STAR_THIRD_PENALTY,
    OUTSIDE_PENALTY,
    formatPlacementBonus,
} from "@/server/domains/spec/helpers/placementBonus";

const ROWS: {label: string; note?: string; bonus: number}[] = [
    {label: "Upper-bracket finalist", bonus: UPPER_FINALIST_BONUS},
    {label: "3rd place", note: "5★ specs only", bonus: FIVE_STAR_THIRD_PENALTY},
    {label: "Outside the top 3", bonus: OUTSIDE_PENALTY},
];

export default function PlacementBonuses() {
    return (
        <div className="mb-5 flex flex-wrap items-center gap-x-3 gap-y-1.5 border-b border-border/60 pb-3 text-xs">
            <span className="font-semibold uppercase tracking-wider text-muted-foreground">
                Placement bonus
            </span>
            {ROWS.map((row, i) => (
                <div key={row.label} className="flex items-center gap-1.5">
                    {i > 0 && <span className="text-border">·</span>}
                    <span className="text-foreground">{row.label}</span>
                    {row.note && <span className="text-muted-foreground">({row.note})</span>}
                    <span className="font-mono font-medium tabular-nums text-foreground">
                        {formatPlacementBonus(row.bonus)}
                    </span>
                </div>
            ))}
        </div>
    );
}
