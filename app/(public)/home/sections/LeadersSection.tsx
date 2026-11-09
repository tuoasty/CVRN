import Link from "next/link";
import {SectionHeading} from "./SectionHeading";
import {PlayerAvatar} from "./TeamMark";
import type {LeaderColumn} from "../model/types";

export function LeadersSection({columns, href}: {columns: LeaderColumn[]; href: string}) {
    if (columns.length === 0) return null;
    return (
        <section aria-label="Season leaders">
            <SectionHeading title="Season leaders" href={href} linkLabel="Leaderboard" />
            <div className="mt-4 grid grid-cols-1 gap-x-10 gap-y-8 sm:grid-cols-2 lg:grid-cols-4">
                {columns.map(col => (
                    <div key={col.category} className="min-w-0">
                        <h3 className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">{col.label}</h3>
                        <ol className="mt-2 space-y-2.5">
                            {col.entries.map(e => (
                                <li key={e.cell.playerId} className="flex items-center gap-3">
                                    <span className="w-3 font-mono text-xs tabular-nums text-muted-foreground">{e.rank}</span>
                                    <PlayerAvatar src={e.cell.avatarUrl} size={28} />
                                    <span className="min-w-0 flex-1">
                                        {e.cell.href ? (
                                            <Link href={e.cell.href} className="block truncate text-sm font-semibold hover:underline hover:underline-offset-4">
                                                {e.cell.name}
                                            </Link>
                                        ) : (
                                            <span className="block truncate text-sm font-semibold">{e.cell.name}</span>
                                        )}
                                        {e.teamName && <span className="block truncate text-xs text-muted-foreground">{e.teamName}</span>}
                                    </span>
                                    <span className="font-mono text-base font-semibold tabular-nums">{e.cell.value}</span>
                                </li>
                            ))}
                        </ol>
                    </div>
                ))}
            </div>
        </section>
    );
}
