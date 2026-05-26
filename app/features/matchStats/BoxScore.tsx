"use client";

import Image from "next/image";
import {PlayerMatchStatSet, PlayerMatchStatTotal, Team} from "@/shared/types/db";
import {Tabs, TabsList, TabsTrigger, TabsContent} from "@/app/components/ui/tabs";
import {Table, TableHeader, TableBody, TableRow, TableHead, TableCell} from "@/app/components/ui/table";
import {Tooltip, TooltipContent, TooltipTrigger, TooltipProvider} from "@/app/components/ui/tooltip";
import {getLogoClassName} from "@/app/lib/logoClass";
import {cn} from "@/lib/utils";
import {
    DEFAULT_COLUMNS,
    DETAILED_COLUMNS,
    StatColumn,
    StatRow,
    formatStatValue,
    groupColumns,
    findLeaderKeys,
} from "./statColumnMeta";
import TeamTotalsComparison from "./TeamTotalsComparison";

const teamColorBg = (color: string | null | undefined, alphaHex: string): string | undefined => {
    if (!color) return undefined;
    if (/^#[0-9A-Fa-f]{6}$/.test(color)) return `${color}${alphaHex}`;
    if (/^#[0-9A-Fa-f]{3}$/.test(color)) return `${color}${alphaHex}`;
    return undefined;
};

type Props = {
    homeTeam: Team | null;
    awayTeam: Team | null;
    statSets: PlayerMatchStatSet[];
    statTotals: PlayerMatchStatTotal[];
    setCount: number;
    detailed: boolean;
    showHome: boolean;
    showAway: boolean;
};

export default function BoxScore({
    homeTeam,
    awayTeam,
    statSets,
    statTotals,
    setCount,
    detailed,
    showHome,
    showAway,
}: Props) {
    const columns = detailed ? DETAILED_COLUMNS : DEFAULT_COLUMNS;

    if (statTotals.length === 0) {
        return (
            <div className="panel p-6">
                <p className="text-sm text-muted-foreground">
                    Box score not yet available — stats haven&apos;t been synced for this match yet.
                </p>
            </div>
        );
    }

    const setTabs = Array.from({length: setCount}, (_, i) => i + 1);

    return (
        <TooltipProvider delayDuration={200}>
            <Tabs defaultValue="total" className="space-y-4">
                <TabsList>
                    <TabsTrigger value="total">Total</TabsTrigger>
                    {setTabs.map(n => (
                        <TabsTrigger key={n} value={`set-${n}`}>
                            Set {n}
                        </TabsTrigger>
                    ))}
                </TabsList>

                <TabsContent value="total" className="space-y-6">
                    {showHome && <TeamSection team={homeTeam} rows={statTotals} columns={columns} />}
                    {showAway && <TeamSection team={awayTeam} rows={statTotals} columns={columns} />}
                    <TeamTotalsComparison
                        homeTeam={homeTeam}
                        awayTeam={awayTeam}
                        rows={statTotals}
                        columns={columns}
                    />
                </TabsContent>

                {setTabs.map(n => {
                    const setRows = statSets.filter(r => r.set_number === n);
                    return (
                        <TabsContent key={n} value={`set-${n}`} className="space-y-6">
                            {showHome && <TeamSection team={homeTeam} rows={setRows} columns={columns} />}
                            {showAway && <TeamSection team={awayTeam} rows={setRows} columns={columns} />}
                            <TeamTotalsComparison
                                homeTeam={homeTeam}
                                awayTeam={awayTeam}
                                rows={setRows}
                                columns={columns}
                            />
                        </TabsContent>
                    );
                })}
            </Tabs>
        </TooltipProvider>
    );
}

function TeamSection({
    team,
    rows,
    columns,
}: {
    team: Team | null;
    rows: StatRow[];
    columns: StatColumn[];
}) {
    const teamId = team?.id ?? null;
    const teamRows = teamId ? rows.filter(r => r.team_id === teamId) : [];

    return (
        <section>
            <StickyTeamHeader team={team} />
            {teamRows.length === 0 ? (
                <div className="panel p-4 mt-2">
                    <p className="text-sm text-muted-foreground">No stats recorded for this team.</p>
                </div>
            ) : (
                <BoxScoreTable rows={teamRows} columns={columns} />
            )}
        </section>
    );
}

function StickyTeamHeader({team}: {team: Team | null}) {
    const borderColor = team?.brick_color || "hsl(var(--border))";
    const bgTint = teamColorBg(team?.brick_color, "0D");

    return (
        <div
            className="border-l-4 px-3 py-2 flex items-center gap-3 mb-2"
            style={{
                borderLeftColor: borderColor,
                backgroundColor: bgTint,
            }}
        >
            {team?.logo_url && (
                <div className="relative w-8 h-8 rounded-sm overflow-hidden shrink-0">
                    <Image
                        src={team.logo_url}
                        alt={team.name}
                        fill
                        sizes="32px"
                        className={getLogoClassName(team.logo_bg_removed)}
                    />
                </div>
            )}
            <h3 className="text-sm font-semibold uppercase tracking-wide">
                {team?.name ?? "Team"}
            </h3>
        </div>
    );
}

function BoxScoreTable({rows, columns}: {rows: StatRow[]; columns: StatColumn[]}) {
    const groups = groupColumns(columns);
    const leaders = findLeaderKeys(rows, columns);

    return (
        <div className="overflow-x-scroll border border-border rounded-sm [scrollbar-gutter:stable]">
            <Table>
                <TableHeader>
                    {/* Group row */}
                    <TableRow className="border-b-0 hover:bg-transparent">
                        <TableHead
                            rowSpan={2}
                            className="sticky left-0 z-10 bg-background text-left align-bottom min-w-[180px] border-r border-border/30 text-xs font-semibold uppercase tracking-wider"
                        >
                            Player
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
                    {/* Stat label row */}
                    <TableRow className="hover:bg-transparent">
                        {columns.map((col, i) => {
                            const isLastInGroup = i === columns.length - 1 || columns[i + 1].group !== col.group;
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
                                        <TooltipContent side="top">{col.description}</TooltipContent>
                                    </Tooltip>
                                </TableHead>
                            );
                        })}
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {rows.map(row => (
                        <TableRow key={row.player_id} className="group/row">
                            <TableCell className="sticky left-0 z-[1] bg-background group-hover/row:bg-muted/50 transition-colors border-r border-border/30">
                                <PlayerCell row={row} />
                            </TableCell>
                            {columns.map((col, i) => {
                                const isLeader = leaders.has(`${row.player_id}:${col.key}`);
                                const isLastInGroup =
                                    i === columns.length - 1 || columns[i + 1].group !== col.group;
                                return (
                                    <TableCell
                                        key={col.key}
                                        className={cn(
                                            "text-right font-mono tabular-nums whitespace-nowrap",
                                            isLeader ? "font-bold text-foreground" : "text-foreground/70",
                                            isLastInGroup && "border-r border-border/30 last:border-r-0",
                                        )}
                                    >
                                        {formatStatValue(col.accessor(row), col.format)}
                                    </TableCell>
                                );
                            })}
                        </TableRow>
                    ))}
                    {/* Team total row */}
                    <TableRow className="border-t-2 border-border bg-muted/30 hover:bg-muted/30">
                        <TableCell className="sticky left-0 z-[1] bg-muted/30 font-semibold text-xs uppercase tracking-wider border-r border-border/30">
                            Team Total
                        </TableCell>
                        {columns.map((col, i) => {
                            const isLastInGroup =
                                i === columns.length - 1 || columns[i + 1].group !== col.group;
                            return (
                                <TableCell
                                    key={col.key}
                                    className={cn(
                                        "text-right font-mono tabular-nums font-semibold whitespace-nowrap",
                                        isLastInGroup && "border-r border-border/30 last:border-r-0",
                                    )}
                                >
                                    {formatStatValue(col.aggregator(rows), col.format)}
                                </TableCell>
                            );
                        })}
                    </TableRow>
                </TableBody>
            </Table>
        </div>
    );
}

function PlayerCell({row}: {row: StatRow}) {
    const hasBothNames = !!row.display_name && !!row.username && row.display_name !== row.username;

    return (
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
            <div className="flex flex-col min-w-0 leading-tight">
                <span className="text-sm font-medium truncate">
                    {row.display_name || row.username || "Unknown"}
                </span>
                {hasBothNames && (
                    <span className="text-[11px] text-muted-foreground truncate">@{row.username}</span>
                )}
            </div>
        </div>
    );
}
