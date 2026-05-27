"use client";

import {useState, useCallback, useRef} from "react";
import {Table, TableHeader, TableBody, TableRow, TableHead, TableCell} from "@/app/components/ui/table";
import {Tooltip, TooltipContent, TooltipTrigger, TooltipProvider} from "@/app/components/ui/tooltip";
import {cn} from "@/lib/utils";
import StatViewToggle from "@/app/features/matchStats/StatViewToggle";
import {
    PlayerSeasonStat,
} from "@/server/domains/player";
import {
    PLAYER_COMPACT_COLUMNS,
    PLAYER_DETAILED_COLUMNS,
    PlayerStatColumn,
    formatPlayerStat,
    groupPlayerColumns,
} from "./playerStatColumnMeta";

const DRAG_THRESHOLD = 4;

function useDragScroll() {
    const cleanupRef = useRef<(() => void) | null>(null);
    return useCallback((node: HTMLTableElement | null) => {
        cleanupRef.current?.();
        cleanupRef.current = null;
        const el = node?.parentElement;
        if (!el) return;
        let isDown = false, dragging = false, startX = 0, startScroll = 0;
        const onDown = (e: PointerEvent) => {
            if (e.pointerType !== "mouse" || e.button !== 0) return;
            isDown = true; dragging = false; startX = e.clientX; startScroll = el.scrollLeft;
        };
        const onMove = (e: PointerEvent) => {
            if (!isDown) return;
            const dx = e.clientX - startX;
            if (!dragging && Math.abs(dx) < DRAG_THRESHOLD) return;
            if (!dragging) { dragging = true; el.setPointerCapture(e.pointerId); el.style.cursor = "grabbing"; el.style.userSelect = "none"; }
            e.preventDefault();
            el.scrollLeft = startScroll - dx;
        };
        const stop = () => { isDown = false; dragging = false; el.style.cursor = "grab"; el.style.userSelect = ""; };
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

type Props = {
    rows: PlayerSeasonStat[];
};

export default function PlayerSeasonStatsTable({rows}: Props) {
    const [detailed, setDetailed] = useState(false);
    const columns = detailed ? PLAYER_DETAILED_COLUMNS : PLAYER_COMPACT_COLUMNS;
    const groups = groupPlayerColumns(columns);
    const tableRef = useDragScroll();

    if (rows.length === 0) {
        return (
            <div className="panel p-6">
                <p className="text-sm text-muted-foreground">No stats recorded yet.</p>
            </div>
        );
    }

    return (
        <div className="space-y-3">
            <div className="flex items-center justify-between">
                <h2 className="text-lg font-semibold">Season Stats</h2>
                <StatViewToggle detailed={detailed} onDetailedChange={setDetailed} />
            </div>
            <TooltipProvider delayDuration={200}>
                <div className="border border-border rounded-sm overflow-hidden [&>[data-slot=table-container]]:overflow-x-auto">
                    <Table ref={tableRef} className="border-collapse">
                        <TableHeader>
                            <TableRow className="border-b-0 hover:bg-transparent">
                                <TableHead
                                    rowSpan={2}
                                    className="sticky left-0 z-10 bg-background text-left align-bottom min-w-[120px] px-2 border-r border-border/30 text-[11px] font-semibold uppercase tracking-wider"
                                >
                                    Season
                                </TableHead>
                                {groups.map((g, idx) => (
                                    <TableHead
                                        key={`group-${idx}`}
                                        colSpan={g.columns.length}
                                        className="h-6 px-1 text-center text-[10px] uppercase tracking-wider font-semibold text-muted-foreground border-r border-border/30 last:border-r-0"
                                    >
                                        {g.group}
                                    </TableHead>
                                ))}
                            </TableRow>
                            <TableRow className="hover:bg-transparent">
                                {columns.map((col, i) => {
                                    const isLastInGroup = i === columns.length - 1 || columns[i + 1].group !== col.group;
                                    return (
                                        <TableHead
                                            key={col.key as string}
                                            className={cn(
                                                "h-8 px-1 text-right text-[11px] font-semibold whitespace-nowrap",
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
                            {rows.map(row => (
                                <SeasonStatRow key={row.season_id} row={row} columns={columns} />
                            ))}
                        </TableBody>
                    </Table>
                </div>
            </TooltipProvider>
        </div>
    );
}

function SeasonStatRow({row, columns}: {row: PlayerSeasonStat; columns: PlayerStatColumn[]}) {
    return (
        <TableRow className="hover:bg-muted/30">
            <TableCell className="sticky left-0 z-[1] bg-background hover:bg-muted/30 transition-colors border-r border-border/30 py-1.5 px-2 text-sm font-medium whitespace-nowrap">
                <span className="text-[10px] text-muted-foreground uppercase tracking-wider mr-1">{row.region_code}</span>
                {row.season_name}
            </TableCell>
            {columns.map((col, i) => {
                const isLastInGroup = i === columns.length - 1 || columns[i + 1].group !== col.group;
                const value = row[col.key] as number | null;
                return (
                    <TableCell
                        key={col.key as string}
                        className={cn(
                            "py-1 px-1 text-right text-xs font-mono tabular-nums whitespace-nowrap text-foreground/70",
                            isLastInGroup && "border-r border-border/30 last:border-r-0",
                        )}
                    >
                        {formatPlayerStat(value, col.format)}
                    </TableCell>
                );
            })}
        </TableRow>
    );
}
