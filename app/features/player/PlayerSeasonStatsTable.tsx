"use client";

import {useState, useCallback, useRef} from "react";
import Image from "next/image";
import {Table, TableHeader, TableBody, TableRow, TableHead, TableCell} from "@/app/components/ui/table";
import {Tooltip, TooltipContent, TooltipTrigger, TooltipProvider} from "@/app/components/ui/tooltip";
import {cn} from "@/lib/utils";
import {getLogoClassName} from "@/app/lib/logoClass";
import StatViewSelector from "./StatViewSelector";
import {
    PlayerSeasonStat,
} from "@/server/domains/player";
import {
    STAT_VIEW_COLUMNS,
    StatView,
    PlayerStatColumn,
    formatPlayerStat,
    groupPlayerColumns,
    playerHeadWidthClass,
} from "./playerStatColumnMeta";
import {formatPositions, positionsTitle} from "./formatPositions";

type TeamLogoInfo = {logo_url: string | null; logo_bg_removed: boolean};

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
    teamLogoBySeasonId?: Map<string, TeamLogoInfo>;
};

export default function PlayerSeasonStatsTable({rows, teamLogoBySeasonId}: Props) {
    const [view, setView] = useState<StatView>("overview");
    const columns = STAT_VIEW_COLUMNS[view];
    const groups = groupPlayerColumns(columns);
    const tableRef = useDragScroll();

    if (rows.length === 0) {
        return <p className="text-sm text-muted-foreground">No season stats yet.</p>;
    }

    return (
        <div className="space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                    <h2 className="text-lg font-semibold">Season Stats</h2>
                </div>
                <StatViewSelector value={view} onChange={setView} />
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
                                <TableHead
                                    rowSpan={2}
                                    className="text-left align-bottom px-2 border-r border-border/30 text-[11px] font-semibold uppercase tracking-wider"
                                >
                                    <Tooltip>
                                        <TooltipTrigger asChild>
                                            <span className="cursor-help">Pos</span>
                                        </TooltipTrigger>
                                        <TooltipContent side="top">Positions played</TooltipContent>
                                    </Tooltip>
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
                                                "h-8 px-1 text-center text-[11px] font-semibold whitespace-nowrap",
                                                playerHeadWidthClass(col.format),
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
                                <SeasonStatRow key={row.season_id} row={row} columns={columns} teamLogo={teamLogoBySeasonId?.get(row.season_id)} />
                            ))}
                        </TableBody>
                    </Table>
                </div>
            </TooltipProvider>
        </div>
    );
}

function SeasonStatRow({row, columns, teamLogo}: {row: PlayerSeasonStat; columns: PlayerStatColumn[]; teamLogo?: TeamLogoInfo}) {
    return (
        <TableRow className="hover:bg-muted/30">
            <TableCell className="sticky left-0 z-[1] bg-background hover:bg-muted/30 transition-colors border-r border-border/30 py-1.5 px-2 text-sm font-medium whitespace-nowrap">
                <div className="flex items-center gap-1.5">
                    <span className="text-[10px] text-muted-foreground uppercase tracking-wider">{row.region_code}</span>
                    <span>{row.season_name}</span>
                    {teamLogo?.logo_url && (
                        <div className="relative w-5 h-5 shrink-0 ml-auto">
                            <Image
                                src={teamLogo.logo_url}
                                alt=""
                                fill
                                sizes="20px"
                                className={cn("object-contain", getLogoClassName(teamLogo.logo_bg_removed))}
                                unoptimized
                            />
                        </div>
                    )}
                </div>
            </TableCell>
            <TableCell className="border-r border-border/30 py-1 px-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground whitespace-nowrap">
                <span title={positionsTitle(row.position_counts)}>{formatPositions(row.position_counts)}</span>
            </TableCell>
            {columns.map((col, i) => {
                const isLastInGroup = i === columns.length - 1 || columns[i + 1].group !== col.group;
                const value = row[col.key] as number | null;
                return (
                    <TableCell
                        key={col.key as string}
                        className={cn(
                            "py-1 px-1 text-center text-xs font-mono tabular-nums whitespace-nowrap text-foreground/70",
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
