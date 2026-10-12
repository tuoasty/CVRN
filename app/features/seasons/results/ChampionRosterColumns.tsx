"use client";

import {Loader2} from "lucide-react";
import {SeasonAwardEntryWithPlayer} from "@/server/domains/season";
import {AwardThumb, EmptyRows, SectionHeader, TextAction} from "./ResultsUi";
import {POSITION_ROW} from "./AllStarColumns";
import {rosterRoleLabel} from "./awardGroups";

interface Props {
    roster: SeasonAwardEntryWithPlayer[];
    championName: string | null;
    fetching: boolean;
    onRefetch: () => void;
}

function RosterRows({rows}: {rows: SeasonAwardEntryWithPlayer[]}) {
    return (
        <ul className="min-w-0 [&>li:last-child]:border-b-0">
            {rows.map(a => (
                <li key={a.id} className={POSITION_ROW}>
                    <AwardThumb url={a.full_avatar_url} name={a.players.username} />
                    <span className="truncate text-xs text-muted-foreground">{rosterRoleLabel(a.award_name)}</span>
                    <span className="truncate">@{a.players.username}</span>
                </li>
            ))}
        </ul>
    );
}

export function ChampionRosterColumns({roster, championName, fetching, onRefetch}: Props) {
    const half = Math.ceil(roster.length / 2);
    const meta = championName ? `${championName} · ${roster.length}` : roster.length > 0 ? `${roster.length}` : undefined;

    return (
        <section>
            <SectionHeader title="Champion roster" meta={meta}>
                <TextAction disabled={fetching} onClick={onRefetch}>
                    {fetching && <Loader2 className="size-3 animate-spin motion-reduce:animate-none" />}
                    Re-fetch
                </TextAction>
            </SectionHeader>
            {roster.length === 0 ? (
                <EmptyRows>{championName ? "Re-fetch to pull the champion roster" : "Set a 1st place team, then re-fetch"}</EmptyRows>
            ) : (
                <div className="grid grid-cols-1 gap-x-4 sm:grid-cols-2">
                    <RosterRows rows={roster.slice(0, half)} />
                    <RosterRows rows={roster.slice(half)} />
                </div>
            )}
        </section>
    );
}
