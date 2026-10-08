"use client";

import {useId} from "react";
import Link from "next/link";
import {cn} from "@/lib/utils";
import {topPositions, positionsTitle} from "@/app/features/player/formatPositions";
import type {RecordCategoryGroup, RecordEntry} from "@/server/domains/record";
import {recordTeamHref} from "./recordContext";
import {EntryLink, RecordAvatar, ROW_LINK, TeamLogo} from "./RecordIdentity";
import {Dot, Num, RecordContextLine} from "./RecordContextLine";

function Positions({entry, prefixed}: {entry: RecordEntry; prefixed?: boolean}) {
    const codes = topPositions(entry.positionCounts);
    if (codes.length === 0) return null;
    return (
        <span title={positionsTitle(entry.positionCounts)} className="shrink-0 font-mono text-xs text-muted-foreground">
            {prefixed && <Dot />}
            {codes.join("/")}
        </span>
    );
}

function distinctUsername(entry: RecordEntry): string | null {
    const player = entry.subject === "player" ? entry.player : null;
    if (!player?.displayName) return null;
    return player.displayName.toLowerCase() === player.username.toLowerCase() ? null : player.username;
}

function HolderRow({entry}: {entry: RecordEntry}) {
    const team = entry.subject === "player" ? entry.team : null;
    const teamHref = team ? recordTeamHref(entry, team.slug) : null;
    const username = distinctUsername(entry);
    return (
        <li className="grid grid-cols-[52px_minmax(0,1fr)_auto] items-center gap-3 border-b border-border pb-3 pt-3.5">
            <span className="sr-only">Rank {entry.rank}</span>
            <RecordAvatar entry={entry} size={40} className="justify-self-end" />
            <div className="flex min-w-0 flex-col gap-0.5">
                <div className="flex min-w-0 items-baseline gap-1.5">
                    <EntryLink entry={entry} className="text-sm font-semibold" />
                    {username && <span className="min-w-0 truncate text-xs text-muted-foreground">{username}</span>}
                </div>
                {team && (
                    <div className="flex min-w-0 items-center gap-1 whitespace-nowrap text-xs">
                        <TeamLogo team={team} size={20} />
                        {teamHref ? (
                            <Link href={teamHref} className={cn("min-w-0 truncate", ROW_LINK)}>
                                {team.name}
                            </Link>
                        ) : (
                            <span className="min-w-0 truncate">{team.name}</span>
                        )}
                        <Positions entry={entry} prefixed />
                    </div>
                )}
                <RecordContextLine entry={entry} />
            </div>
            <span className="text-right font-mono text-2xl font-semibold tabular-nums">{entry.value}</span>
        </li>
    );
}

function ChaserRow({entry}: {entry: RecordEntry}) {
    const team = entry.subject === "player" ? entry.team : null;
    return (
        <li className="grid grid-cols-[28px_24px_minmax(0,1fr)_40px] items-center border-b border-border/60 py-[7px] last:border-b-0">
            <span className="pr-2 text-right font-mono text-xs tabular-nums text-muted-foreground">{entry.rank}</span>
            <RecordAvatar entry={entry} size={24} />
            <div className="flex min-w-0 flex-col pl-3">
                <div className="flex min-w-0 items-center gap-1">
                    <EntryLink entry={entry} className="text-sm font-medium" />
                    {team && <TeamLogo team={team} size={20} label={team.name} />}
                    <Positions entry={entry} />
                </div>
                <RecordContextLine entry={entry} />
            </div>
            <span className="pl-2.5 text-right font-mono text-sm font-medium tabular-nums">{entry.value}</span>
        </li>
    );
}

export function RecordCategory({group}: {group: RecordCategoryGroup}) {
    const headingId = useId();
    const [holder, ...chasers] = group.entries;
    if (!holder) return null;
    const last = group.entries[group.entries.length - 1];
    return (
        <section aria-labelledby={headingId}>
            <h2 id={headingId} className="border-b border-border pb-2 text-sm font-semibold">
                {group.label}
            </h2>
            <ol>
                <HolderRow entry={holder} />
                {chasers.map(entry => (
                    <ChaserRow key={entry.rowNum} entry={entry} />
                ))}
            </ol>
            {group.tiedBeyond > 0 && (
                <p className="pt-2 text-xs text-muted-foreground">
                    +<Num>{group.tiedBeyond}</Num> more tied at <Num>{last.value}</Num>
                </p>
            )}
        </section>
    );
}
