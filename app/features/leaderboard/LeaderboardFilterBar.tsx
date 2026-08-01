"use client";

import StatViewSelector from "@/app/features/player/StatViewSelector";
import {StatView} from "@/app/features/player/playerStatColumnMeta";

type Props = {
    view: StatView;
    resultCount: number;
    onViewChange: (view: StatView) => void;
};

export default function LeaderboardFilterBar({view, resultCount, onViewChange}: Props) {
    return (
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <StatViewSelector value={view} onChange={onViewChange} />
            <span className="text-xs text-muted-foreground">
                {resultCount} {resultCount === 1 ? "player" : "players"}
            </span>
        </div>
    );
}
