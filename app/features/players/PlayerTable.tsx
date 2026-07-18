import PlayerRow, { PLAYER_ROW_GRID } from "./PlayerRow"
import { Skeleton } from "@/app/components/ui/skeleton"
import type { PlayerSearchHit } from "@/server/domains/player"

function RowSkeleton() {
    return (
        <div className={`${PLAYER_ROW_GRID} relative min-h-[3.75rem] py-2`}>
            {/* bottom-bleeding avatar placeholder, matching PlayerRow */}
            <Skeleton className="absolute bottom-0 left-4 h-12 w-12 rounded-sm sm:left-6 sm:w-14" />
            <Skeleton className="h-4 w-44 rounded-sm" />
            <Skeleton className="ml-auto hidden h-3 w-6 rounded-sm sm:block" />
            <div className="flex items-center justify-end gap-2 sm:min-w-[8rem]">
                <Skeleton className="h-5 w-5 shrink-0 rounded-sm" />
                <Skeleton className="hidden h-4 w-20 rounded-sm sm:block" />
            </div>
        </div>
    )
}

export function PlayerTableSkeleton({ rows = 8 }: { rows?: number }) {
    return (
        <div className="panel divide-y divide-border overflow-hidden">
            {[...Array(rows)].map((_, i) => (
                <RowSkeleton key={i} />
            ))}
        </div>
    )
}

export function PlayerTable({ players }: { players: PlayerSearchHit[] }) {
    return (
        <div className="panel overflow-hidden">
            {/* Column header strip — aligned to the row grid, matching StandingsTable's micro-labels.
                The avatar column is intentionally unlabeled; "Player" sits over the names. */}
            <div
                className={`${PLAYER_ROW_GRID} border-b border-border bg-muted/30 py-2 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground`}
            >
                <span>Player</span>
                <span className="hidden text-right sm:block">Region</span>
                <span className="text-right sm:min-w-[8rem]">Team</span>
            </div>
            <div className="divide-y divide-border">
                {players.map(player => (
                    <PlayerRow key={player.id} player={player} />
                ))}
            </div>
        </div>
    )
}
