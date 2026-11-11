"use client";

import {useState, useCallback, useRef} from "react";
import Image from "next/image";
import { DefaultTeamLogo } from "@/app/components/ui/DefaultTeamLogo";
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

const STICKY = "sticky left-0 bg-background border-r border-border";
const GROUP_RULE = "border-r border-r-border/30";
const LABEL = "text-xs font-semibold uppercase tracking-[0.05em] text-muted-foreground";

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
                <h2 className="text-lg font-semibold">Season Stats</h2>
                <StatViewSelector value={view} onChange={setView} />
            </div>
            <TooltipProvider delayDuration={200}>
                <div className="overflow-hidden rounded-sm border border-border">
                <Table ref={tableRef} className="border-separate border-spacing-0">
                    <TableHeader>
                        <TableRow className="border-b-0 hover:bg-transparent">
                            <TableHead
                                rowSpan={2}
                                className={cn(STICKY, "z-10 min-w-[7.5rem] border-b border-border px-2 text-left align-bottom", LABEL)}
                            >
                                Season
                            </TableHead>
                            <TableHead
                                rowSpan={2}
                                className={cn("border-b border-border px-2 text-left align-bottom", GROUP_RULE, LABEL)}
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
                                    className={cn("h-7 px-1 text-center", LABEL, idx < groups.length - 1 && GROUP_RULE)}
                                >
                                    {g.group}
                                </TableHead>
                            ))}
                        </TableRow>
                        <TableRow className="hover:bg-transparent">
                            {columns.map((col, i) => {
                                const isLastColumn = i === columns.length - 1;
                                const isLastInGroup = isLastColumn || columns[i + 1].group !== col.group;
                                return (
                                    <TableHead
                                        key={col.key as string}
                                        className={cn(
                                            "h-8 border-b border-border px-1 text-center whitespace-nowrap",
                                            LABEL,
                                            playerHeadWidthClass(col.format),
                                            isLastInGroup && !isLastColumn && GROUP_RULE,
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
        <TableRow className="group border-b-0 hover:bg-muted/30">
            <TableCell className={cn(STICKY, "z-[1] px-2 py-2 text-sm font-medium whitespace-nowrap transition-shadow duration-150 group-hover:shadow-[inset_0_0_0_100vmax_hsl(var(--muted)/0.3)]")}>
                <div className="flex items-center gap-1.5">
                    <span className="font-mono text-xs text-muted-foreground">{row.region_code}</span>
                    <span>{row.season_name}</span>
                    {teamLogo && (
                        <div className="relative ml-auto h-5 w-5 shrink-0">
                            {teamLogo.logo_url ? (
                                <Image
                                    src={teamLogo.logo_url}
                                    alt=""
                                    fill
                                    sizes="20px"
                                    className={cn("object-contain", getLogoClassName(teamLogo.logo_bg_removed))}
                                    unoptimized
                                />
                            ) : (
                                <DefaultTeamLogo sizes="20px" alt="" />
                            )}
                        </div>
                    )}
                </div>
            </TableCell>
            <TableCell className={cn("px-2 py-2 font-mono text-xs uppercase text-muted-foreground whitespace-nowrap", GROUP_RULE)}>
                <span title={positionsTitle(row.position_counts)}>{formatPositions(row.position_counts)}</span>
            </TableCell>
            {columns.map((col, i) => {
                const isLastColumn = i === columns.length - 1;
                const isLastInGroup = isLastColumn || columns[i + 1].group !== col.group;
                const value = row[col.key] as number | null;
                return (
                    <TableCell
                        key={col.key as string}
                        className={cn(
                            "px-1 py-2 text-center font-mono text-xs tabular-nums whitespace-nowrap text-foreground",
                            isLastInGroup && !isLastColumn && GROUP_RULE,
                        )}
                    >
                        {formatPlayerStat(value, col.format)}
                    </TableCell>
                );
            })}
        </TableRow>
    );
}
