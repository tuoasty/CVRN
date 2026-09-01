import Image from "next/image"
import { cn } from "@/lib/utils"
import type { Team } from "@/shared/types/db"

function initials(name: string | null | undefined): string {
    if (!name) return "?"
    const parts = name.trim().split(/\s+/)
    const letters = parts.length > 1 ? parts.map(w => w[0]).join("") : name.slice(0, 3)
    return letters.slice(0, 3).toUpperCase()
}

function ScoreTeam({ team, dim, side }: { team: Team | null; dim: boolean; side: "home" | "away" }) {
    return (
        <div className={cn("flex min-w-0 flex-1 items-center gap-3", side === "home" ? "justify-end" : "flex-row-reverse justify-end", dim && "opacity-50")}>
            <span className="hidden truncate text-[15px] font-semibold text-white [text-shadow:0_1px_4px_rgba(0,0,0,0.7)] sm:inline sm:text-[17px]">
                {team?.name ?? "TBD"}
            </span>
            {team?.logo_url ? (
                <span className="relative h-9 w-9 flex-none">
                    <Image src={team.logo_url} alt="" fill sizes="40px" className="object-contain [filter:drop-shadow(0_1px_3px_rgba(0,0,0,0.85))]" unoptimized />
                </span>
            ) : (
                <span className="flex h-9 w-9 flex-none items-center justify-center border border-white/20 bg-white/10 text-xs font-bold text-white">
                    {initials(team?.name)}
                </span>
            )}
        </div>
    )
}

type Props = {
    gfxUrl: string | null
    homeTeam: Team | null
    awayTeam: Team | null
    homeSetsWon: number
    awaySetsWon: number
    isCompleted: boolean
    roundLabel: string
}

export default function MatchArticleHero({
    gfxUrl,
    homeTeam,
    awayTeam,
    homeSetsWon,
    awaySetsWon,
    isCompleted,
    roundLabel,
}: Props) {
    const homeWon = isCompleted && homeSetsWon > awaySetsWon
    const awayWon = isCompleted && awaySetsWon > homeSetsWon

    return (
        <div className="relative aspect-video w-full overflow-hidden bg-black">
            {gfxUrl && (
                <>
                    <div
                        aria-hidden
                        className="absolute inset-0 scale-110 bg-cover bg-center blur-2xl brightness-[0.45]"
                        style={{ backgroundImage: `url("${gfxUrl}")` }}
                    />
                    <Image src={gfxUrl} alt="" fill sizes="(max-width: 768px) 100vw, 720px" className="z-[1] object-contain" unoptimized />
                </>
            )}

            <div className="pointer-events-none absolute inset-0 z-[2]">
                <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/30 to-transparent" />

                <div className="absolute inset-x-0 top-0 flex items-center bg-gradient-to-b from-black/70 to-transparent px-5 py-4">
                    <span className="text-xs font-semibold uppercase tracking-[0.09em] text-white/90 sm:text-[13px]">{roundLabel}</span>
                </div>

                <div className="absolute inset-x-0 bottom-0 px-6 pb-6">
                    <div className="mx-auto flex max-w-[900px] items-center justify-center gap-4 sm:gap-6">
                        <ScoreTeam team={homeTeam} dim={isCompleted && !homeWon} side="home" />
                        <span className="shrink-0 px-1 font-mono text-2xl font-semibold tabular-nums text-white [text-shadow:0_1px_6px_rgba(0,0,0,0.7)] sm:text-[34px]">
                            {isCompleted ? (
                                <>
                                    <span className={cn(!homeWon && "text-white/50")}>{homeSetsWon}</span>
                                    <span className="text-white/40"> – </span>
                                    <span className={cn(!awayWon && "text-white/50")}>{awaySetsWon}</span>
                                </>
                            ) : (
                                "VS"
                            )}
                        </span>
                        <ScoreTeam team={awayTeam} dim={isCompleted && !awayWon} side="away" />
                    </div>
                </div>
            </div>
        </div>
    )
}
