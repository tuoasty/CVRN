import {
    formatPlacementBonus,
    type PlacementBonusConfig,
} from "@/server/domains/spec/helpers/placementBonus";
import {formatPlacement} from "@/app/utils/placement";

export default function PlacementBonuses({config}: {config: PlacementBonusConfig}) {
    const ROWS: {label: string; bonus: number}[] = [
        {label: "Upper-bracket finalist", bonus: config.upperFinalist},
        ...config.ladder
            .map((bonus, i) => ({label: formatPlacement(i + 1, 1), bonus}))
            .filter(row => row.bonus !== 0),
        {label: "Outside the top 8", bonus: config.outside},
    ];

    return (
        <div className="mb-5 flex flex-wrap items-center gap-x-3 gap-y-1.5 border-b border-border/60 pb-3 text-xs">
            <span className="font-semibold uppercase tracking-wider text-muted-foreground">
                Placement bonus
            </span>
            {ROWS.map((row, i) => (
                <div key={row.label} className="flex items-center gap-1.5">
                    {i > 0 && <span className="text-border">·</span>}
                    <span className="text-foreground">{row.label}</span>
                    <span className="font-mono font-medium tabular-nums text-foreground">
                        {formatPlacementBonus(row.bonus)}
                    </span>
                </div>
            ))}
        </div>
    );
}
