import Link from "next/link";
import AvatarImage from "@/app/components/ui/AvatarImage";
import { SectionHeading } from "@/app/(public)/home/sections/SectionHeading";
import type { Leader } from "@/app/features/teams/detail/model/leaders";

export type LeaderPlayer = { name: string; username: string | null; avatarUrl: string | null; href: string | null };

type Props = {
    source: "season" | "alltime";
    leaders: Leader[];
    players: Record<string, LeaderPlayer>;
};

export default function LeadersSection({ source, leaders, players }: Props) {
    return (
        <section aria-label="Leaders" className="min-w-0">
            <SectionHeading title="Leaders">
                <span className="text-xs text-muted-foreground">
                    {source === "season" ? "this season · per set" : "all time · per set"}
                </span>
            </SectionHeading>
            {leaders.length === 0 ? (
                <p className="py-6 text-sm text-muted-foreground">No player stats recorded for this team yet.</p>
            ) : (
                <>
                    <ul className="mt-2">
                        {leaders.map((leader) => {
                            const player = players[leader.playerId];
                            const name = player?.name ?? "Unknown";
                            return (
                                <li
                                    key={leader.key}
                                    className="grid grid-cols-[72px_32px_minmax(0,1fr)_auto] items-center gap-3 py-2"
                                >
                                    <span className="text-xs font-semibold uppercase tracking-[0.05em] text-muted-foreground">
                                        {leader.label}
                                    </span>
                                    <span className="relative h-8 w-8 overflow-hidden">
                                        <AvatarImage src={player?.avatarUrl} alt="" sizes="32px" />
                                    </span>
                                    {player?.href ? (
                                        <Link
                                            href={player.href}
                                            prefetch={false}
                                            className="truncate text-sm font-semibold text-foreground hover:underline hover:underline-offset-4 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-foreground"
                                        >
                                            {name}
                                        </Link>
                                    ) : (
                                        <span className="truncate text-sm font-semibold text-foreground">{name}</span>
                                    )}
                                    <span className="font-mono text-sm tabular-nums text-foreground">
                                        {leader.value.toFixed(1)}
                                    </span>
                                </li>
                            );
                        })}
                    </ul>
                </>
            )}
        </section>
    );
}
