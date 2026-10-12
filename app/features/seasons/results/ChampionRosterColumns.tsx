"use client";

import {Loader2} from "lucide-react";
import {SeasonAwardEntryWithPlayer} from "@/server/domains/season";
import {cn} from "@/lib/utils";
import {AvatarRefreshButton, AwardThumb, EmptyRows, SectionHeader, TextAction} from "./ResultsUi";
import {ACTION_ROW, POSITION_CELLS} from "./AllStarColumns";
import {rosterRoleLabel} from "./awardGroups";

interface Props {
    roster: SeasonAwardEntryWithPlayer[];
    championName: string | null;
    fetching: boolean;
    onRefetch: () => void;
    refreshingId: string | null;
    onRefreshAvatar: (award: SeasonAwardEntryWithPlayer) => void;
}

interface RosterRowsProps {
    rows: SeasonAwardEntryWithPlayer[];
    refreshingId: string | null;
    onRefreshAvatar: (award: SeasonAwardEntryWithPlayer) => void;
}

function RosterRows({rows, refreshingId, onRefreshAvatar}: RosterRowsProps) {
    return (
        <ul className="min-w-0 [&>li:last-child]:border-b-0">
            {rows.map(a => (
                <li key={a.id} className={ACTION_ROW}>
                    <span className={cn(POSITION_CELLS, "min-w-0 flex-1")}>
                        <AwardThumb url={a.full_avatar_url} name={a.players.username} />
                        <span className="truncate text-xs text-muted-foreground">{rosterRoleLabel(a.award_name)}</span>
                        <span className="truncate">@{a.players.username}</span>
                    </span>
                    <AvatarRefreshButton
                        username={a.players.username}
                        busy={refreshingId === a.id}
                        disabled={refreshingId !== null}
                        onClick={() => onRefreshAvatar(a)}
                    />
                </li>
            ))}
        </ul>
    );
}

export function ChampionRosterColumns({roster, championName, fetching, onRefetch, refreshingId, onRefreshAvatar}: Props) {
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
                    <RosterRows rows={roster.slice(0, half)} refreshingId={refreshingId} onRefreshAvatar={onRefreshAvatar} />
                    <RosterRows rows={roster.slice(half)} refreshingId={refreshingId} onRefreshAvatar={onRefreshAvatar} />
                </div>
            )}
        </section>
    );
}
