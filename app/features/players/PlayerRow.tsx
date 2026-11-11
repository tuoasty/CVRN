import Link from "next/link"
import Image from "next/image"
import { ChevronRight } from "lucide-react"
import { DefaultTeamLogo } from "@/app/components/ui/DefaultTeamLogo"
import PlayerAvatar from "./PlayerAvatar"
import { buildPublicPlayerHref } from "@/app/utils/matchDetailHref"
import { getLogoClassName } from "@/app/lib/logoClass"
import { cn } from "@/lib/utils"
import type { PlayerSearchHit } from "@/server/domains/player"

export const PLAYER_ROW_GRID =
    "grid items-center gap-3 px-2 sm:gap-4 " +
    "grid-cols-[2.75rem_minmax(0,1fr)_2.5rem_0.75rem] " +
    "sm:grid-cols-[3.5rem_minmax(0,1.1fr)_minmax(0,0.9fr)_2.5rem_minmax(0,1fr)_2.5rem_0.75rem]"

export const PLAYER_ROW_BOX = "min-h-[3.75rem] py-1.5"

const LOGO_BLEED_MASK = "linear-gradient(to right, black 0%, black 55%, transparent 100%)"

export default function PlayerRow({ player }: { player: PlayerSearchHit }) {
    const href = buildPublicPlayerHref(player.username)
    const team = player.team
    const name = player.display_name || player.username || "Unknown player"
    const handle = player.username ? `@${player.username}` : null

    return (
        <Link
            href={href ?? "#"}
            prefetch={false}
            className={cn(
                PLAYER_ROW_GRID,
                PLAYER_ROW_BOX,
                "group relative overflow-hidden transition-colors duration-150 hover:bg-muted/30",
                "focus-visible:outline focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-foreground",
                !href && "pointer-events-none opacity-60"
            )}
        >
            {team?.brick_color && (
                <span
                    aria-hidden
                    className="pointer-events-none absolute inset-y-0 left-0 w-48 opacity-[0.16] transition-opacity duration-200 group-hover:opacity-[0.28] motion-reduce:transition-none"
                    style={{ background: `linear-gradient(to right, ${team.brick_color}, transparent)` }}
                />
            )}

            {team?.logo_url && (
                <span
                    aria-hidden
                    className="pointer-events-none absolute inset-y-0 -left-8 w-28 opacity-[0.16] transition-opacity duration-200 group-hover:opacity-[0.26] motion-reduce:transition-none"
                    style={{ maskImage: LOGO_BLEED_MASK, WebkitMaskImage: LOGO_BLEED_MASK }}
                >
                    <Image
                        src={team.logo_url}
                        alt=""
                        fill
                        sizes="112px"
                        className="object-cover object-left grayscale"
                        unoptimized
                    />
                </span>
            )}

            <div className="relative -mb-1.5 h-[3.25rem] w-full self-end sm:h-[3.5rem]">
                <PlayerAvatar src={player.avatar_url} alt="" />
            </div>

            <div className="relative min-w-0">
                <div className="truncate text-sm font-semibold text-foreground group-hover:underline group-hover:underline-offset-4">{name}</div>
                <div className="truncate text-xs text-muted-foreground sm:hidden">
                    {[handle, player.region_code, team?.name].filter(Boolean).join(" · ")}
                </div>
            </div>

            <div className="relative hidden min-w-0 truncate text-sm text-muted-foreground sm:block">
                {handle}
            </div>

            <div className="relative h-10 w-10 self-center">
                {team?.logo_url ? (
                    <Image
                        src={team.logo_url}
                        alt=""
                        fill
                        sizes="40px"
                        className={getLogoClassName(team.logo_bg_removed)}
                        unoptimized
                    />
                ) : team ? (
                    <DefaultTeamLogo sizes="40px" alt="" />
                ) : null}
            </div>

            <div className="relative hidden min-w-0 truncate text-sm text-foreground sm:block">
                {team?.name ?? ""}
            </div>

            <div className="relative hidden text-right font-mono text-xs font-semibold uppercase text-muted-foreground sm:block">
                {player.region_code ?? ""}
            </div>

            <ChevronRight className="relative h-3 w-3 text-muted-foreground" aria-hidden />
        </Link>
    )
}
