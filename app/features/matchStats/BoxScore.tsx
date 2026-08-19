"use client";

import {useCallback, useRef} from "react";
import Image from "next/image";
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

const isHex = (color: string | null | undefined): color is string => {
    if (!color) return false;
    return /^#[0-9A-Fa-f]{6}$/.test(color) || /^#[0-9A-Fa-f]{3}$/.test(color);
};

const DRAG_THRESHOLD = 4;

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

export default function BoxScore({homeTeam, awayTeam, rows, selectedTeam, detailed, showSetsPlayed, positionsByPlayer}: Props) {
    const columns = buildColumns(detailed, showSetsPlayed);
    const tableRef = useDragScroll();

    if (rows.length === 0) {
        return (
            <div className="panel p-6">
                <p className="text-sm text-muted-foreground">
                    No statistics available for this match.
                </p>
            </div>
        );
    }

    const selectedRows = selectedTeam ? rows.filter(r => r.team_id === selectedTeam.id) : [];
    const homeRows = homeTeam ? rows.filter(r => r.team_id === homeTeam.id) : [];
    const awayRows = awayTeam ? rows.filter(r => r.team_id === awayTeam.id) : [];

    const homeTotals = columns.map(c => c.aggregator(homeRows));
    const awayTotals = columns.map(c => c.aggregator(awayRows));

    const groups = groupColumns(columns);
    const leaders = findLeaderKeys(selectedRows, columns);

    return (
        <TooltipProvider delayDuration={200}>
            <div className="border border-border rounded-sm overflow-hidden [&>[data-slot=table-container]]:overflow-x-auto">
                <Table ref={tableRef} className="border-collapse">
                    <TableHeader>
                        <TableRow className="border-b-0 hover:bg-transparent">
                            <TableHead
                                rowSpan={2}
                                className="sticky left-0 z-10 bg-background text-left align-bottom min-w-[160px] px-2 border-r border-border/30 text-[11px] font-semibold uppercase tracking-wider"
                            >
                                Player
                            </TableHead>
                            {groups.map((g, idx) => (
                                <TableHead
                                    key={`group-${idx}-${g.group}`}
                                    colSpan={g.columns.length}
                                    className="h-6 px-1 text-center text-[10px] uppercase tracking-wider font-semibold text-muted-foreground border-r border-border/30 last:border-r-0"
                                >
                                    {g.group}
                                </TableHead>
                            ))}
                        </TableRow>
                        <TableRow className="hover:bg-transparent">
                            {columns.map((col, i) => {
                                const isLastInGroup =
                                    i === columns.length - 1 || columns[i + 1].group !== col.group;
                                return (
                                    <TableHead
                                        key={col.key}
                                        className={cn(
                                            "h-8 px-1 text-right text-[11px] font-semibold whitespace-nowrap",
                                            statHeadWidthClass(col.format),
                                            isLastInGroup && "border-r border-border/30 last:border-r-0",
                                        )}
                                    >
                                        <Tooltip>
                                            <TooltipTrigger asChild>
                                                <span className="cursor-help">{col.label}</span>
                                            </TooltipTrigger>
                                            <TooltipContent side="top">{col.description}</TooltipContent>
                                        </Tooltip>
                                    </TableHead>
                                );
                            })}
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {selectedRows.length === 0 ? (
                            <TableRow>
                                <TableCell
                                    colSpan={columns.length + 1}
                                    className="text-center text-sm text-muted-foreground py-6"
                                >
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
                                <TableRow className="bg-muted hover:bg-muted border-t-2 border-border">
                                    <TableCell className="sticky left-0 z-[1] bg-muted h-8 py-0 px-2 text-[11px] font-semibold uppercase tracking-wider text-foreground/70 border-r border-border/30 align-middle">
                                        Team Totals
                                    </TableCell>
                                    {columns.map((col, i) => {
                                        const isLastInGroup = i === columns.length - 1 || columns[i + 1].group !== col.group;
                                        return (
                                            <TableCell
                                                key={col.key}
                                                className={cn(
                                                    "h-8 py-0 px-1 text-right text-[11px] font-semibold text-muted-foreground whitespace-nowrap align-middle",
                                                    isLastInGroup && "border-r border-border/30 last:border-r-0",
                                                )}
                                            >
                                                {col.label}
                                            </TableCell>
                                        );
                                    })}
                                </TableRow>
                                <TeamTotalRow
                                    team={homeTeam}
                                    totals={homeTotals}
                                    otherTotals={awayTotals}
                                    columns={columns}
                                />
                                <TeamTotalRow
                                    team={awayTeam}
                                    totals={awayTotals}
                                    otherTotals={homeTotals}
                                    columns={columns}
                                />
                            </>
                        )}
                    </TableBody>
                </Table>
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
        <TableRow className="group/row hover:bg-muted/30">
            <TableCell className="sticky left-0 z-[1] bg-background group-hover/row:bg-muted transition-colors border-r border-border/30">
                <PlayerCell row={row} positions={positions} />
            </TableCell>
            {columns.map((col, i) => {
                const isLeader = leaders.has(`${row.player_id}:${col.key}`);
                const isLastInGroup = i === columns.length - 1 || columns[i + 1].group !== col.group;
                return (
                    <TableCell
                        key={col.key}
                        className={cn(
                            "py-1 px-1 text-right text-xs font-mono tabular-nums whitespace-nowrap",
                            isLeader ? "font-bold text-foreground" : "text-foreground/70",
                            isLastInGroup && "border-r border-border/30 last:border-r-0",
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
    const useColor = isHex(team.brick_color);

    return (
        <TableRow className="group/row bg-muted/40 hover:bg-muted/60">
            <TableCell className="sticky left-0 z-[1] bg-background group-hover/row:bg-muted/60 transition-colors border-r border-border/30 py-1.5">
                <TeamLabel team={team} />
            </TableCell>
            {columns.map((col, i) => {
                const myVal = totals[i];
                const otherVal = otherTotals[i];
                const isLeader = myVal !== null && otherVal !== null && myVal > otherVal;
                const isTie = myVal !== null && otherVal !== null && myVal === otherVal;
                const isLastInGroup = i === columns.length - 1 || columns[i + 1].group !== col.group;

                return (
                    <TableCell
                        key={col.key}
                        className={cn(
                            "py-1.5 px-1 text-right text-xs font-mono tabular-nums font-semibold whitespace-nowrap",
                            isLeader && !useColor && "text-foreground",
                            !isLeader && !isTie && "text-foreground/40",
                            isTie && "text-foreground/70",
                            isLastInGroup && "border-r border-border/30 last:border-r-0",
                        )}
                        style={isLeader && useColor ? {color: team.brick_color || undefined} : undefined}
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

    const content = (
        <div className="flex items-center gap-2 min-w-0">
            <div className="relative w-8 h-8 rounded-full overflow-hidden border border-border shrink-0 bg-muted">
                {row.avatar_url && (
                    <Image
                        src={row.avatar_url}
                        alt={row.username || ""}
                        fill
                        sizes="32px"
                        className="object-cover"
                        unoptimized
                    />
                )}
            </div>
            <div className="flex flex-col min-w-0 leading-tight flex-1">
                <span className="text-sm font-medium truncate">
                    {row.display_name || row.username || "Unknown"}
                </span>
                {hasBothNames && (
                    <span className="text-[11px] text-muted-foreground truncate">@{row.username}</span>
                )}
            </div>
            {positionList.length > 0 && (
                <span className="shrink-0 pl-3 text-[11px] font-semibold uppercase tracking-widest text-muted-foreground tabular-nums">
                    {positionList.join(" / ")}
                </span>
            )}
        </div>
    );

    if (href) {
        return (
            <Link href={href} prefetch={false} className="block hover:opacity-80 transition-opacity">
                {content}
            </Link>
        );
    }
    return content;
}

function TeamLabel({team}: {team: Team}) {
    return (
        <div className="flex items-center gap-1.5 min-w-0">
            <div className="relative w-6 h-6 rounded-sm overflow-hidden shrink-0">
                {team.logo_url ? (
                    <Image
                        src={team.logo_url}
                        alt={team.name}
                        fill
                        sizes="24px"
                        className={getLogoClassName(team.logo_bg_removed)}
                    />
                ) : (
                    <div className="w-full h-full bg-muted" />
                )}
            </div>
            <span className="text-xs font-semibold uppercase tracking-wide truncate">{team.name}</span>
        </div>
    );
}
