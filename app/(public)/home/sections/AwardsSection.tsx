import Link from "next/link";
import {SectionHeading} from "./SectionHeading";
import {PlayerAvatar, TeamMark} from "./TeamMark";
import type {AwardRow} from "../model/types";

export function AwardsSection({rows, href}: {rows: AwardRow[]; href: string}) {
    if (rows.length === 0) return null;
    return (
        <section aria-label="Awards">
            <SectionHeading title="Awards" href={href} linkLabel="Season archive" />
            <ul className="mt-2 space-y-2.5">
                {rows.map(row => (
                    <li key={row.key} className="flex items-center gap-2.5 py-0.5">
                        <PlayerAvatar src={row.avatarUrl} size={40} />
                        <span className="min-w-0 flex-1 leading-tight">
                            <span className="block truncate text-[11px] font-medium uppercase tracking-wide text-muted-foreground">{row.label}</span>
                            {row.href ? (
                                <Link href={row.href} className="block truncate text-sm font-semibold hover:underline hover:underline-offset-4">
                                    {row.playerName}
                                </Link>
                            ) : (
                                <span className="block truncate text-sm font-semibold">{row.playerName}</span>
                            )}
                            {row.username && <span className="block truncate text-[11px] text-muted-foreground">@{row.username}</span>}
                        </span>
                        {row.team &&
                            (row.team.href ? (
                                <Link href={row.team.href} aria-label={row.team.name} title={row.team.name} className="shrink-0">
                                    <TeamMark team={row.team} size={24} />
                                </Link>
                            ) : (
                                <span title={row.team.name} className="shrink-0">
                                    <TeamMark team={row.team} size={24} />
                                </span>
                            ))}
                    </li>
                ))}
            </ul>
        </section>
    );
}
