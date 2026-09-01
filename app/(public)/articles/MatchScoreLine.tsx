import Image from "next/image"
import { cn } from "@/lib/utils"
import type { Team } from "@/shared/types/db"

function initials(name: string | null | undefined): string {
    if (!name) return "?"
    const parts = name.trim().split(/\s+/)
    const letters = parts.length > 1 ? parts.map(w => w[0]).join("") : name.slice(0, 3)
    return letters.slice(0, 3).toUpperCase()
}

function TeamSide({ team, dim, side }: { team: Team | null; dim: boolean; side: "home" | "away" }) {
    return (
        <div className={cn("flex items-center gap-2.5", side === "away" && "flex-row-reverse", dim && "opacity-50")}>
            <span className="hidden text-sm font-semibold sm:inline">{team?.name ?? "TBD"}</span>
            {team?.logo_url ? (
                <span className="relative h-8 w-8 flex-none">
                    <Image src={team.logo_url} alt="" fill sizes="32px" className="object-contain" unoptimized />
                </span>
            ) : (
                <span className="flex h-8 w-8 flex-none items-center justify-center border border-border bg-muted text-xs font-bold text-muted-foreground">
                    {initials(team?.name)}
                </span>
            )}
        </div>
    )
}

type Props = {
    homeTeam: Team | null
    awayTeam: Team | null
    homeSetsWon: number
    awaySetsWon: number
    isCompleted: boolean
}

export default function MatchScoreLine({ homeTeam, awayTeam, homeSetsWon, awaySetsWon, isCompleted }: Props) {
    const homeWon = isCompleted && homeSetsWon > awaySetsWon
    const awayWon = isCompleted && awaySetsWon > homeSetsWon

    return (
        <div className="flex items-center gap-3 sm:gap-4">
            <TeamSide team={homeTeam} dim={isCompleted && !homeWon} side="home" />
            <span className="shrink-0 font-mono text-2xl font-semibold tabular-nums">
                {isCompleted ? (
                    <>
                        <span className={cn(!homeWon && "text-muted-foreground")}>{homeSetsWon}</span>
                        <span className="text-muted-foreground"> – </span>
                        <span className={cn(!awayWon && "text-muted-foreground")}>{awaySetsWon}</span>
                    </>
                ) : (
                    "VS"
                )}
            </span>
            <TeamSide team={awayTeam} dim={isCompleted && !awayWon} side="away" />
        </div>
    )
}
