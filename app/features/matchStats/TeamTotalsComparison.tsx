"use client";

import Image from "next/image";
import {Team} from "@/shared/types/db";
import {Table, TableHeader, TableBody, TableRow, TableHead, TableCell} from "@/app/components/ui/table";
import {Tooltip, TooltipContent, TooltipTrigger, TooltipProvider} from "@/app/components/ui/tooltip";
import {getLogoClassName} from "@/app/lib/logoClass";
import {cn} from "@/lib/utils";
import {StatColumn, StatRow, formatStatValue, groupColumns} from "./statColumnMeta";

type Props = {
    homeTeam: Team | null;
    awayTeam: Team | null;
    rows: StatRow[];
    columns: StatColumn[];
};

const isHex = (color: string | null | undefined): boolean => {
    if (!color) return false;
    return /^#[0-9A-Fa-f]{6}$/.test(color) || /^#[0-9A-Fa-f]{3}$/.test(color);
};

export default function TeamTotalsComparison({homeTeam, awayTeam, rows, columns}: Props) {
    if (!homeTeam || !awayTeam) return null;

    const homeRows = rows.filter(r => r.team_id === homeTeam.id);
    const awayRows = rows.filter(r => r.team_id === awayTeam.id);

    if (homeRows.length === 0 && awayRows.length === 0) return null;

    const homeTotals = columns.map(col => col.aggregator(homeRows));
    const awayTotals = columns.map(col => col.aggregator(awayRows));
    const groups = groupColumns(columns);

    return (
        <TooltipProvider delayDuration={200}>
            <section className="space-y-2">
                <h3 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground px-1">
                    Team Totals
                </h3>
                <div className="overflow-x-auto border border-border rounded-sm">
                    <Table>
                        <TableHeader>
                            <TableRow className="border-b-0 hover:bg-transparent">
                                <TableHead
                                    rowSpan={2}
                                    className="sticky left-0 z-10 bg-background text-left align-bottom min-w-[180px] border-r border-border/30 text-xs font-semibold uppercase tracking-wider"
                                >
                                    Team
                                </TableHead>
                                {groups.map((g, idx) => (
                                    <TableHead
                                        key={`group-${idx}-${g.group}`}
                                        colSpan={g.columns.length}
                                        className="text-center text-[10px] uppercase tracking-wider font-semibold text-muted-foreground border-r border-border/30 last:border-r-0 h-7"
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
                                                "text-right text-xs font-semibold whitespace-nowrap",
                                                isLastInGroup && "border-r border-border/30 last:border-r-0",
                                            )}
                                        >
                                            <Tooltip>
                                                <TooltipTrigger asChild>
                                                    <span className="cursor-help">{col.label}</span>
                                                </TooltipTrigger>
                                                <TooltipContent side="top">
                                                    {col.description}
                                                </TooltipContent>
                                            </Tooltip>
                                        </TableHead>
                                    );
                                })}
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            <TeamRow
                                team={homeTeam}
                                totals={homeTotals}
                                otherTotals={awayTotals}
                                columns={columns}
                            />
                            <TeamRow
                                team={awayTeam}
                                totals={awayTotals}
                                otherTotals={homeTotals}
                                columns={columns}
                            />
                        </TableBody>
                    </Table>
                </div>
            </section>
        </TooltipProvider>
    );
}

function TeamRow({
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
        <TableRow className="hover:bg-muted/20">
            <TableCell className="sticky left-0 z-[1] bg-background group-hover:bg-muted/20 border-r border-border/30">
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
                            "text-right font-mono tabular-nums whitespace-nowrap",
                            isLeader && !useColor && "font-bold text-foreground",
                            isLeader && useColor && "font-bold",
                            !isLeader && !isTie && "text-foreground/50",
                            isTie && "text-foreground/80",
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

function TeamLabel({team}: {team: Team}) {
    return (
        <div className="flex items-center gap-2 min-w-0">
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
            <span className="text-sm font-semibold truncate">{team.name}</span>
        </div>
    );
}
