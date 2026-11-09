"use client";

import {useCallback, useRef} from "react";
import Image from "next/image";
import {DefaultTeamLogo} from "@/app/components/ui/DefaultTeamLogo";
import Link from "next/link";
import {buildPublicPlayerHref} from "@/app/utils/matchDetailHref";
import {Team} from "@/shared/types/db";
import {Table, TableHeader, TableBody, TableRow, TableHead, TableCell} from "@/app/components/ui/table";
import {Tooltip, TooltipContent, TooltipTrigger, TooltipProvider} from "@/app/components/ui/tooltip";
import {getLogoClassName} from "@/app/lib/logoClass";
import {cn} from "@/lib/utils";
import {
    buildColumns,
    StatColumn,
    StatRow,
    formatStatValue,
    groupColumns,
    findLeaderKeys,
    statHeadWidthClass,
} from "./statColumnMeta";

type Props = {
    homeTeam: Team | null;
    awayTeam: Team | null;
    rows: StatRow[];
    selectedTeam: Team | null;
    detailed: boolean;
    showSetsPlayed: boolean;
    positionsByPlayer?: Map<string, string[]>;
};

const DRAG_THRESHOLD = 4;

const STICKY_CELL =
    "sticky left-0 z-[1] bg-background shadow-[-1px_0_0_hsl(var(--background)),1px_0_0_hsl(var(--border))] group-hover/row:bg-[color-mix(in_srgb,hsl(var(--muted))_40%,hsl(var(--background)))]";
const ROW_HOVER = "group-hover/row:bg-[color-mix(in_srgb,hsl(var(--muted))_40%,hsl(var(--background)))]";
const PLAYER_COL = "w-24 min-w-24 max-w-24 sm:w-auto sm:min-w-[160px] sm:max-w-none";

function useDragScroll() {
    const cleanupRef = useRef<(() => void) | null>(null);

    return useCallback((node: HTMLTableElement | null) => {
        cleanupRef.current?.();
        cleanupRef.current = null;

        const el = node?.parentElement;
        if (!el) return;

        let isDown = false;
        let dragging = false;
        let startX = 0;
        let startScroll = 0;

        const onDown = (e: PointerEvent) => {
            if (e.pointerType !== "mouse" || e.button !== 0) return;
            isDown = true;
            dragging = false;
            startX = e.clientX;
            startScroll = el.scrollLeft;
        };
        const onMove = (e: PointerEvent) => {
            if (!isDown) return;
            const dx = e.clientX - startX;
            if (!dragging && Math.abs(dx) < DRAG_THRESHOLD) return;
            if (!dragging) {
                dragging = true;
                el.setPointerCapture(e.pointerId);
                el.style.cursor = "grabbing";
                el.style.userSelect = "none";
            }
            e.preventDefault();
            el.scrollLeft = startScroll - dx;
        };
        const stop = () => {
            isDown = false;
            dragging = false;
            el.style.cursor = "grab";
            el.style.userSelect = "";
        };

        el.style.cursor = "grab";
        el.addEventListener("pointerdown", onDown);
        el.addEventListener("pointermove", onMove);
        el.addEventListener("pointerup", stop);
        el.addEventListener("pointercancel", stop);

        cleanupRef.current = () => {
            el.style.cursor = "";
            el.style.userSelect = "";
            el.removeEventListener("pointerdown", onDown);
            el.removeEventListener("pointermove", onMove);
            el.removeEventListener("pointerup", stop);
            el.removeEventListener("pointercancel", stop);
        };
    }, []);
}

function ScrollFade() {
    return (
        <div
            aria-hidden
            className="pointer-events-none absolute inset-y-0 right-0 w-6 bg-gradient-to-r from-transparent to-background sm:hidden"
        />
    );
}

const groupEdge = (columns: StatColumn[], i: number) => i === 0 || columns[i - 1].group !== columns[i].group;

export default function BoxScore({homeTeam, awayTeam, rows, selectedTeam, detailed, showSetsPlayed, positionsByPlayer}: Props) {
    const columns = buildColumns(detailed, showSetsPlayed);
    const tableRef = useDragScroll();

    if (rows.length === 0) {
        return <p className="py-4 text-sm text-muted-foreground">No statistics available for this match.</p>;
    }

    const selectedRows = selectedTeam ? rows.filter(r => r.team_id === selectedTeam.id) : [];
    const homeRows = homeTeam ? rows.filter(r => r.team_id === homeTeam.id) : [];
    const awayRows = awayTeam ? rows.filter(r => r.team_id === awayTeam.id) : [];

    const homeTotals = columns.map(c => c.aggregator(homeRows));
    const awayTotals = columns.map(c => c.aggregator(awayRows));

    const groups = groupColumns(columns);
    const leaders = findLeaderKeys(selectedRows, columns);
    const label = "text-xs font-semibold uppercase tracking-wider text-muted-foreground";

    return (
        <TooltipProvider delayDuration={200}>
            <div className="relative [&>[data-slot=table-container]]:overflow-x-auto">
                <Table ref={tableRef} className="border-separate border-spacing-0">
                    <TableHeader>
                        <TableRow className="hidden border-0 hover:bg-transparent sm:table-row">
                            <TableHead rowSpan={2} className={cn(STICKY_CELL, PLAYER_COL, label, "z-10 border-b border-border px-2 text-left align-bottom")}>
                                Player
                            </TableHead>
                            {groups.map((g, idx) => (
                                <TableHead
                                    key={`group-${idx}-${g.group}`}
                                    colSpan={g.columns.length}
                                    className={cn("h-6 px-1 text-center text-[11px] font-semibold uppercase tracking-wider text-muted-foreground", idx > 0 && "border-l border-border/30")}
                                >
                                    {g.group}
                                </TableHead>
                            ))}
                        </TableRow>
                        <TableRow className="border-0 hover:bg-transparent">
                            <TableHead className={cn(STICKY_CELL, PLAYER_COL, label, "z-10 border-b border-border px-2 text-left sm:hidden")}>
                                Player
                            </TableHead>
                            {columns.map((col, i) => (
                                <TableHead
                                    key={col.key}
                                    className={cn(
                                        "h-8 whitespace-nowrap border-b border-border px-1.5 text-right text-xs font-semibold",
                                        statHeadWidthClass(col.format),
                                        i > 0 && groupEdge(columns, i) && "sm:border-l sm:border-l-border/30",
                                    )}
                                >
                                    <Tooltip>
                                        <TooltipTrigger asChild>
                                            <span className="cursor-help">{col.label}</span>
                                        </TooltipTrigger>
                                        <TooltipContent side="top">{col.description}</TooltipContent>
                                    </Tooltip>
                                </TableHead>
                            ))}
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {selectedRows.length === 0 ? (
                            <TableRow className="border-0">
                                <TableCell colSpan={columns.length + 1} className="py-6 text-center text-sm text-muted-foreground">
                                    No stats recorded for this team.
                                </TableCell>
                            </TableRow>
                        ) : (
                            selectedRows.map(row => (
                                <PlayerStatRow
                                    key={row.player_id}
                                    row={row}
                                    columns={columns}
                                    leaders={leaders}
                                    positions={row.player_id ? positionsByPlayer?.get(row.player_id) : undefined}
                                />
                            ))
                        )}

                        {homeTeam && awayTeam && (
                            <>
                                <TableRow className="border-0 hover:bg-transparent">
                                    <TableCell className={cn(STICKY_CELL, PLAYER_COL, label, "h-8 border-t border-border px-2 py-0 align-middle")}>
                                        Totals
                                    </TableCell>
                                    {columns.map((col, i) => (
                                        <TableCell
                                            key={col.key}
                                            className={cn(
                                                "h-8 whitespace-nowrap border-t border-border px-1.5 py-0 text-right align-middle text-xs font-semibold text-muted-foreground",
                                                i > 0 && groupEdge(columns, i) && "sm:border-l sm:border-l-border/30",
                                            )}
                                        >
                                            {col.label}
                                        </TableCell>
                                    ))}
                                </TableRow>
                                <TeamTotalRow team={homeTeam} totals={homeTotals} otherTotals={awayTotals} columns={columns} />
                                <TeamTotalRow team={awayTeam} totals={awayTotals} otherTotals={homeTotals} columns={columns} />
                            </>
                        )}
                    </TableBody>
                </Table>
                <ScrollFade />
            </div>
        </TooltipProvider>
    );
}

function PlayerStatRow({
    row,
    columns,
    leaders,
    positions,
}: {
    row: StatRow;
    columns: StatColumn[];
    leaders: Set<string>;
    positions?: string[];
}) {
    return (
        <TableRow className="group/row border-0 hover:bg-transparent">
            <TableCell className={cn(STICKY_CELL, PLAYER_COL, "px-2 py-1.5")}>
                <PlayerCell row={row} positions={positions} />
            </TableCell>
            {columns.map((col, i) => {
                const isLeader = leaders.has(`${row.player_id}:${col.key}`);
                return (
                    <TableCell
                        key={col.key}
                        className={cn(
                            ROW_HOVER,
                            "whitespace-nowrap px-1.5 py-1.5 text-right font-mono text-xs tabular-nums",
                            isLeader ? "font-bold text-foreground" : "text-foreground/70",
                            i > 0 && groupEdge(columns, i) && "sm:border-l sm:border-l-border/30",
                        )}
                    >
                        {formatStatValue(col.accessor(row), col.format)}
                    </TableCell>
                );
            })}
        </TableRow>
    );
}

function TeamTotalRow({
    team,
    totals,
    otherTotals,
    columns,
}: {
    team: Team;
    totals: Array<number | null>;
    otherTotals: Array<number | null>;
    columns: StatColumn[];
}) {
    return (
        <TableRow className="group/row border-0 hover:bg-transparent">
            <TableCell className={cn(STICKY_CELL, PLAYER_COL, "px-2 py-1.5")}>
                <TeamLabel team={team} />
            </TableCell>
            {columns.map((col, i) => {
                const myVal = totals[i];
                const otherVal = otherTotals[i];
                const ahead = myVal !== null && otherVal !== null && myVal > otherVal;
                const tie = myVal !== null && otherVal !== null && myVal === otherVal;
                return (
                    <TableCell
                        key={col.key}
                        className={cn(
                            ROW_HOVER,
                            "whitespace-nowrap px-1.5 py-1.5 text-right font-mono text-xs tabular-nums",
                            ahead ? "font-semibold text-foreground" : tie ? "text-foreground/70" : "text-muted-foreground",
                            i > 0 && groupEdge(columns, i) && "sm:border-l sm:border-l-border/30",
                        )}
                    >
                        {formatStatValue(myVal, col.format)}
                    </TableCell>
                );
            })}
        </TableRow>
    );
}

function PlayerCell({row, positions}: {row: StatRow; positions?: string[]}) {
    const hasBothNames = !!row.display_name && !!row.username && row.display_name !== row.username;
    const href = buildPublicPlayerHref(row.username);
    const positionList =
        positions && positions.length > 0
            ? positions
            : "position" in row && row.position
              ? [row.position]
              : [];
    const position = positionList.length > 0 ? positionList.join(" / ") : null;

    const content = (
        <div className="flex min-w-0 items-center gap-2">
            <div className="relative hidden h-8 w-8 shrink-0 overflow-hidden rounded-full border border-border bg-muted sm:block">
                {row.avatar_url && (
                    <Image src={row.avatar_url} alt={row.username || ""} fill sizes="32px" className="object-cover" unoptimized />
                )}
            </div>
            <div className="flex min-w-0 flex-1 flex-col leading-tight">
                <span className="truncate text-xs font-semibold sm:text-sm sm:font-medium">
                    {row.display_name || row.username || "Unknown"}
                </span>
                {hasBothNames && <span className="hidden truncate text-xs text-muted-foreground sm:block">@{row.username}</span>}
                {position && <span className="truncate text-xs text-muted-foreground sm:hidden">{position}</span>}
            </div>
            {position && (
                <span className="hidden shrink-0 pl-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground sm:inline">
                    {position}
                </span>
            )}
        </div>
    );

    if (href) {
        return (
            <Link href={href} prefetch={false} className="block hover:underline hover:underline-offset-4">
                {content}
            </Link>
        );
    }
    return content;
}

function TeamLabel({team}: {team: Team}) {
    return (
        <div className="flex min-w-0 items-center gap-1.5">
            <div className="relative h-6 w-6 shrink-0 overflow-hidden rounded-sm">
                {team.logo_url ? (
                    <Image src={team.logo_url} alt={team.name} fill sizes="24px" className={getLogoClassName(team.logo_bg_removed)} />
                ) : (
                    <DefaultTeamLogo sizes="24px" alt={team.name} />
                )}
            </div>
            <span className="truncate text-xs font-semibold">{team.name}</span>
        </div>
    );
}
