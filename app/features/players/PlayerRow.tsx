import Link from "next/link"
import Image from "next/image"
import PlayerAvatar from "./PlayerAvatar"
import { buildPublicPlayerHref } from "@/app/utils/matchDetailHref"
import { getLogoClassName } from "@/app/lib/logoClass"
import { cn } from "@/lib/utils"
import type { PlayerSearchHit } from "@/server/domains/player"

export const PLAYER_ROW_GRID =
    "grid items-center gap-3 pl-3 pr-3 sm:gap-4 sm:pr-4 " +
    "grid-cols-[2.75rem_minmax(0,1fr)_2.75rem] " +
    "sm:grid-cols-[3.5rem_13rem_minmax(0,1fr)_3rem_8rem_3.25rem]"

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
                "group relative overflow-hidden transition-colors",
                "hover:bg-muted/40",
                "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring",
                !href && "pointer-events-none opacity-60"
            )}
        >
            {}
            {team?.brick_color && (
                <span
                    aria-hidden
                    className="pointer-events-none absolute inset-y-0 left-0 w-48 opacity-[0.13] transition-opacity duration-200 group-hover:opacity-[0.24]"
                    style={{ background: `linear-gradient(to right, ${team.brick_color}, transparent)` }}
                />
            )}

            {team?.logo_url && (
                <span
                    aria-hidden
                    className="pointer-events-none absolute inset-y-0 -left-8 w-28 opacity-[0.10] transition-opacity duration-200 group-hover:opacity-[0.18]"
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

            {}
            <div className="relative z-10 -mb-1.5 h-[3.5rem] w-full self-end">
                <PlayerAvatar src={player.avatar_url} alt={player.username || "Player"} />
            </div>

            {}
            <div className="relative z-10 min-w-0">
                <div className="truncate text-sm font-semibold">{name}</div>
                <div className="truncate text-xs text-muted-foreground sm:hidden">
                    {[handle, player.region_code, team?.name].filter(Boolean).join(" · ")}
                </div>
            </div>

            <div className="relative z-10 hidden min-w-0 truncate text-sm text-muted-foreground sm:block">
                {handle}
            </div>

            {}
            <div className="relative z-10 h-[2.75rem] w-full self-center sm:h-[3rem]">
                {team?.logo_url && (
                    <Image
                        src={team.logo_url}
                        alt={team.name}
                        fill
                        sizes="48px"
                        className={getLogoClassName(team.logo_bg_removed)}
                        unoptimized
                    />
                )}
            </div>

            <div className="relative z-10 hidden min-w-0 truncate text-sm sm:block">
                {team?.name ?? ""}
            </div>

            {}
            <div className="relative z-10 hidden text-right text-sm font-semibold uppercase tracking-wide text-muted-foreground sm:block">
                {player.region_code ?? ""}
            </div>
        </Link>
    )
}
