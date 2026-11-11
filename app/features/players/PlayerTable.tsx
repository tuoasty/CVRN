import PlayerRow, { PLAYER_ROW_GRID, PLAYER_ROW_BOX } from "./PlayerRow"
import { Skeleton } from "@/app/components/ui/skeleton"
import type { PlayerSearchHit } from "@/server/domains/player"

function RowSkeleton() {
    return (
        <div className={`${PLAYER_ROW_GRID} ${PLAYER_ROW_BOX}`}>
            <Skeleton className="-mb-1.5 h-[3.25rem] w-full self-end rounded-[2px] sm:h-[3.5rem]" />
            <Skeleton className="h-4 w-32 rounded-[2px]" />
            <Skeleton className="hidden h-4 w-24 rounded-[2px] sm:block" />
            <Skeleton className="h-10 w-10 rounded-[2px]" />
            <Skeleton className="hidden h-4 w-20 rounded-[2px] sm:block" />
            <Skeleton className="hidden h-3 w-6 justify-self-end rounded-[2px] sm:block" />
            <span />
        </div>
    )
}

function TableHead() {
    return (
        <div
            className={`${PLAYER_ROW_GRID} hidden border-b border-border pb-2 text-xs font-semibold uppercase tracking-[0.05em] text-muted-foreground sm:grid`}
        >
            <span className="col-span-2">Player</span>
            <span>Username</span>
            <span className="col-span-2">Team</span>
            <span className="text-right">Region</span>
            <span />
        </div>
    )
}

export function PlayerTableSkeleton({ rows = 8 }: { rows?: number }) {
    return (
        <div>
            <TableHead />
            {[...Array(rows)].map((_, i) => (
                <RowSkeleton key={i} />
            ))}
        </div>
    )
}

export function PlayerTable({ players }: { players: PlayerSearchHit[] }) {
    return (
        <div>
            <TableHead />
            {players.map(player => (
                <PlayerRow key={player.id} player={player} />
            ))}
        </div>
    )
}
