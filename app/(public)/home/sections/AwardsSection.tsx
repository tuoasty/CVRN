import Link from "next/link";
import {SectionHeading} from "./SectionHeading";
import {PlayerAvatar} from "./TeamMark";
import type {AwardRow} from "../model/types";

export function AwardsSection({rows, href}: {rows: AwardRow[]; href: string}) {
    if (rows.length === 0) return null;
    return (
        <section aria-label="Awards">
            <SectionHeading title="Awards" href={href} linkLabel="Season archive" />
            <ul className="mt-3 space-y-3">
                {rows.map(row => (
                    <li key={row.key} className="flex items-center gap-3">
                        <PlayerAvatar src={row.avatarUrl} size={40} />
                        <span className="min-w-0 flex-1">
                            <span className="block truncate text-[11px] font-medium uppercase tracking-wider text-muted-foreground">{row.label}</span>
                            {row.href ? (
                                <Link href={row.href} className="block truncate text-sm font-semibold hover:underline hover:underline-offset-4">
                                    {row.playerName}
                                </Link>
                            ) : (
                                <span className="block truncate text-sm font-semibold">{row.playerName}</span>
                            )}
                            {row.teamName && <span className="block truncate text-xs text-muted-foreground">{row.teamName}</span>}
                        </span>
                    </li>
                ))}
            </ul>
        </section>
    );
}
