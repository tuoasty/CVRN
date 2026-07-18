import Link from "next/link"
import Image from "next/image"
import PlayerAvatar from "./PlayerAvatar"
import { buildPublicPlayerHref } from "@/app/utils/matchDetailHref"
import { getLogoClassName } from "@/app/lib/logoClass"
import { cn } from "@/lib/utils"
import type { PlayerSearchHit } from "@/server/domains/player"

// Shared column layout — kept in sync with PlayerTable's header + skeleton.
export const PLAYER_ROW_GRID =
    "grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3 pl-20 pr-3 sm:grid-cols-[minmax(0,1fr)_3rem_auto] sm:pl-24 sm:pr-4"

export default function PlayerRow({ player }: { player: PlayerSearchHit }) {
    const href = buildPublicPlayerHref(player.username)
    const team = player.team
    const name = player.display_name || player.username || "Unknown player"

    return (
        <Link
            href={href ?? "#"}
            className={cn(
                PLAYER_ROW_GRID,
                "group relative min-h-[3.75rem] overflow-hidden py-2 transition-colors",
                "hover:bg-muted/40 focus-visible:bg-muted/40 focus-visible:outline-none",
                !href && "pointer-events-none opacity-60"
            )}
        >
            {/* Team color as a moment, not a wash: a narrow right-edge glow, a whisper at rest,
                blooming on hover. Low opacity absorbs any brick-color format. */}
            {team?.brick_color && (
                <span
                    aria-hidden
                    className="pointer-events-none absolute inset-y-0 right-0 w-1/3 opacity-[0.07] transition-opacity duration-200 group-hover:opacity-[0.18]"
                    style={{ background: `linear-gradient(to left, ${team.brick_color}, transparent)` }}
                />
            )}

            {/* Avatar — free-floating bust, bottom-anchored so the shoulders meet the row edge */}
            <div className="absolute bottom-0 left-4 z-10 h-[3.5rem] w-12 sm:left-6 sm:w-14">
                <PlayerAvatar src={player.avatar_url} alt={player.username || "Player"} />
            </div>

            {/* Player name + username on one line */}
            <div className="relative z-10 min-w-0 truncate">
                <span className="text-sm font-semibold">{name}</span>
                {player.username && (
                    <span className="ml-2.5 text-sm text-muted-foreground">@{player.username}</span>
                )}
            </div>

            {/* Region — quiet micro-label in its own column (sm+) */}
            <div className="relative z-10 hidden text-right text-[11px] font-medium uppercase tracking-wider tabular-nums text-muted-foreground sm:block">
                {player.region_code ?? ""}
            </div>

            {/* Team — far right */}
            <div className="relative z-10 flex items-center justify-end gap-2 sm:min-w-[8rem]">
                {team ? (
                    <>
                        {team.logo_url && (
                            <span className="relative h-5 w-5 shrink-0">
                                <Image
                                    src={team.logo_url}
                                    alt={team.name}
                                    fill
                                    sizes="20px"
                                    className={cn("object-contain", getLogoClassName(team.logo_bg_removed))}
                                    unoptimized
                                />
                            </span>
                        )}
                        <span className="hidden truncate text-sm sm:block">{team.name}</span>
                    </>
                ) : (
                    <span className="text-sm text-muted-foreground/40">—</span>
                )}
            </div>
        </Link>
    )
}
