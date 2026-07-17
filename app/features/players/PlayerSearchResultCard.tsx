import Link from "next/link"
import Image from "next/image"
import AvatarImage from "@/app/components/ui/AvatarImage"
import { Badge } from "@/app/components/ui/badge"
import { buildPublicPlayerHref } from "@/app/utils/matchDetailHref"
import { getLogoClassName } from "@/app/lib/logoClass"
import { cn } from "@/lib/utils"
import type { PlayerSearchHit } from "@/server/domains/player"

export default function PlayerSearchResultCard({ player }: { player: PlayerSearchHit }) {
    const href = buildPublicPlayerHref(player.username)
    const team = player.team

    return (
        <Link
            href={href ?? "#"}
            className={cn(
                "panel p-4 flex items-stretch gap-3 transition-colors hover:border-primary/30",
                !href && "pointer-events-none opacity-60"
            )}
        >
            {/* Team-color accent bar (transparent when no active team) */}
            <div
                className="w-1 self-stretch rounded-full shrink-0"
                style={{ backgroundColor: team?.brick_color ?? "transparent" }}
            />

            <div className="relative w-16 h-16 rounded-sm overflow-hidden border border-border shrink-0">
                <AvatarImage src={player.avatar_url} alt={player.username || "Player"} sizes="64px" />
            </div>

            <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                    <span className="font-semibold truncate">
                        {player.display_name || player.username || "Unknown player"}
                    </span>
                    {player.region_code && (
                        <Badge variant="outline" className="rounded-sm text-[10px] uppercase tracking-wide shrink-0">
                            {player.region_code}
                        </Badge>
                    )}
                </div>

                {player.username && (
                    <div className="text-sm text-muted-foreground truncate">@{player.username}</div>
                )}

                {team ? (
                    <div className="mt-1 flex items-center gap-1.5 min-w-0">
                        {team.logo_url && (
                            <span className="relative w-4 h-4 shrink-0">
                                <Image
                                    src={team.logo_url}
                                    alt={team.name}
                                    fill
                                    sizes="16px"
                                    className={cn("object-contain", getLogoClassName(team.logo_bg_removed))}
                                    unoptimized
                                />
                            </span>
                        )}
                        <span className="text-xs font-medium text-foreground/80 truncate">{team.name}</span>
                        <span className="text-xs text-muted-foreground/70 truncate">· {team.season_name}</span>
                    </div>
                ) : (
                    <div className="mt-1 text-xs text-muted-foreground/50 italic">No active team</div>
                )}
            </div>
        </Link>
    )
}
