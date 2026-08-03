import PlayerRow, { PLAYER_ROW_GRID, PLAYER_ROW_BOX } from "./PlayerRow"
import { Skeleton } from "@/app/components/ui/skeleton"
import type { PlayerSearchHit } from "@/server/domains/player"

function RowSkeleton() {
    return (
        <div className={`${PLAYER_ROW_GRID} ${PLAYER_ROW_BOX} relative`}>
            {}
            <Skeleton className="-mb-1.5 h-[3.5rem] w-full self-end rounded-sm" />
            <Skeleton className="h-4 w-32 rounded-sm" />
            <Skeleton className="hidden h-4 w-24 rounded-sm sm:block" />
            {}
            <Skeleton className="h-[2.75rem] w-full self-center rounded-sm sm:h-[3rem]" />
            <Skeleton className="hidden h-4 w-20 rounded-sm sm:block" />
            <Skeleton className="hidden h-3 w-6 rounded-sm sm:block" />
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
            {}
            <div
                className={`${PLAYER_ROW_GRID} hidden border-b border-border bg-muted/30 py-2 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground sm:grid`}
            >
                <span className="col-start-2 justify-self-start -translate-x-1/2 whitespace-nowrap">Player</span>
                <span className="col-start-3">Username</span>
                <span className="col-start-5 justify-self-start -translate-x-1/2 whitespace-nowrap">Team</span>
                <span className="col-start-6 text-right">Region</span>
            </div>
            <div className="divide-y divide-border">
                {players.map(player => (
                    <PlayerRow key={player.id} player={player} />
                ))}
            </div>
        </div>
    )
}
