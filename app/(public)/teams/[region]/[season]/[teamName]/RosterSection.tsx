import Link from "next/link";
import AvatarImage from "@/app/components/ui/AvatarImage";
import { SectionHeading } from "@/app/(public)/home/sections/SectionHeading";
import { specStarClass } from "@/app/features/information/specs/Stars";
import type { RosterTile } from "@/app/features/teams/detail/model/roster";
import type { PlayerWithRole, RosterSpec } from "@/server/domains/player";
import { positionLabel } from "@/shared/volleyball/positions";
import { cn } from "@/lib/utils";

const ROLE_LABEL: Partial<Record<PlayerWithRole["role"], string>> = {
    captain: "Captain",
    vice_captain: "Vice captain",
    court_captain: "Court captain",
};

function SpecRow({ spec }: { spec: RosterSpec | null }) {
    if (!spec) return <div aria-hidden className="mt-1 h-4" />;
    const empty = Math.max(0, spec.stars - spec.starsAwarded);
    return (
        <div className="mt-1 flex h-4 items-center justify-between gap-2 text-xs">
            <span className={cn("min-w-0 truncate text-muted-foreground", spec.dropped && "line-through")} title={spec.dropped ? `${spec.name} (dropped)` : spec.name}>
                {spec.name}
            </span>
            <span role="img" aria-label={`${spec.starsAwarded} of ${spec.stars} stars`} className="shrink-0 whitespace-nowrap tracking-[1px]">
                <span aria-hidden className={specStarClass(spec.stars)}>{"★".repeat(spec.starsAwarded)}</span>
                <span aria-hidden className="text-border">{"★".repeat(empty)}</span>
            </span>
        </div>
    );
}

function Tile({ tile }: { tile: RosterTile }) {
    const { player, positions, href } = tile;
    const roleLabel = ROLE_LABEL[player.role];
    const name = player.display_name || player.username || "Unknown";

    const body = (
        <>
            <div className="relative aspect-[4/5] w-full overflow-hidden">
                <AvatarImage src={player.avatar_url} alt="" sizes="(max-width: 640px) 50vw, 180px" />
                {roleLabel && (
                    <span className="absolute bottom-0 left-0 bg-background px-1.5 pt-1 text-xs font-semibold uppercase leading-4 tracking-[0.05em] text-foreground">
                        {roleLabel}
                    </span>
                )}
            </div>
            <p className={cn("mt-2 truncate text-sm font-semibold text-foreground", href && "group-hover:underline group-hover:underline-offset-4")}>
                {name}
            </p>
            <div className="mt-0.5 flex items-center justify-between gap-2 text-xs">
                <span className="min-w-0 truncate text-muted-foreground">{player.username ? `@${player.username}` : ""}</span>
                {positions.length > 0 && (
                    <span className="shrink-0 font-semibold text-foreground" title={positions.map(positionLabel).join(", ")}>
                        {positions.join("/")}
                    </span>
                )}
            </div>
            <SpecRow spec={player.spec} />
        </>
    );

    if (!href) return <div className="min-w-0">{body}</div>;
    return (
        <Link
            href={href}
            prefetch={false}
            className="group block min-w-0 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-foreground"
        >
            {body}
        </Link>
    );
}

export default function RosterSection({ tiles, maxPlayers }: { tiles: RosterTile[]; maxPlayers: number }) {
    return (
        <section aria-label="Roster" className="min-w-0">
            <SectionHeading title="Roster">
                <span className="font-mono text-xs tabular-nums text-muted-foreground">
                    {tiles.length} of {maxPlayers}
                </span>
            </SectionHeading>
            {tiles.length === 0 ? (
                <p className="py-8 text-sm text-muted-foreground">No players on this roster yet.</p>
            ) : (
                <div className="mt-4 grid grid-cols-2 gap-x-4 gap-y-6 sm:grid-cols-[repeat(auto-fill,minmax(150px,1fr))]">
                    {tiles.map((tile) => (
                        <Tile key={tile.player.id} tile={tile} />
                    ))}
                </div>
            )}
        </section>
    );
}
