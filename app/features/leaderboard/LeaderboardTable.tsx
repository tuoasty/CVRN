"use client";

import {useMemo} from "react";
import Image from "next/image";
import Link from "next/link";
import {ArrowDown, ArrowUp} from "lucide-react";
import {Table, TableHeader, TableBody, TableRow, TableHead, TableCell} from "@/app/components/ui/table";
import {Tooltip, TooltipContent, TooltipTrigger, TooltipProvider} from "@/app/components/ui/tooltip";
import {cn} from "@/lib/utils";
import {getLogoClassName} from "@/app/lib/logoClass";
import {buildPublicTeamHref} from "@/app/utils/matchDetailHref";
import {PlayerLeaderboardRow} from "@/server/domains/player";
import {
    STAT_VIEW_COLUMNS,
    MIN_SETS_FOR_RATE,
    PlayerStatColumn,
    formatPlayerStat,
    groupPlayerColumns,
    playerColWidthClass,
} from "@/app/features/player/playerStatColumnMeta";
import {LeaderboardFilters, SortKey} from "./useLeaderboardFilters";

type Props = {
    rows: PlayerLeaderboardRow[];
    filters: LeaderboardFilters;
    onSort: (key: SortKey) => void;
    /**
     * Season boards scope every row to one region, so the column would repeat a single
     * value down the whole table. Built here for the all-time board, where region varies.
     */
    showRegion?: boolean;
};

/**
 * Nulls sort last in BOTH directions. A player with no attempts has `hit_eff: null`,
 * and treating that as -Infinity/0 would float them to the top of an ascending sort.
 * The min-sets qualifier does not cover this: a player can clear six sets and still
 * have never attempted a spike, so null and unqualified are separate cases.
 */
function compareRows(a: PlayerLeaderboardRow, b: PlayerLeaderboardRow, key: SortKey, desc: boolean): number {
    const av = a[key] as number | null;
    const bv = b[key] as number | null;
    if (av === null || av === undefined) return bv === null || bv === undefined ? 0 : 1;
    if (bv === null || bv === undefined) return -1;
    if (av === bv) return 0;
    return desc ? bv - av : av - bv;
}

// Left offsets for the sticky identity block. Must match the rank and player widths
// below — `left-*` cannot be derived from a sibling's width in CSS.
const RANK_W = "w-14";
const PLAYER_W = "w-[15rem]";
const TEAM_W = "w-[11rem]";
const REGION_W = "w-20";

export default function LeaderboardTable({rows, filters, onSort, showRegion = false}: Props) {
    const columns = STAT_VIEW_COLUMNS[filters.view];
    const groups = groupPlayerColumns(columns);

    // Only ratio columns are gated. Per-set rates are honest at any sample size, so
    // sorting by K/S ranks everyone.
    const activeColumn = columns.find(c => c.key === filters.sort);
    const isRatioSort = activeColumn?.format === "pct";

    const {qualified, unqualified} = useMemo(() => {
        const desc = filters.order === "desc";
        // Ties break on sets played so a stable, meaningful order survives equal values.
        const all = [...rows].sort(
            (a, b) =>
                compareRows(a, b, filters.sort, desc) ||
                (b.sets_played ?? 0) - (a.sets_played ?? 0) ||
                a.username.localeCompare(b.username)
        );

        if (!isRatioSort) return {qualified: all, unqualified: []};

        // Partition preserves the sort, so each block stays ordered without re-sorting.
        // Unqualified players are shown rather than filtered out: a player checking his
        // own numbers should never simply vanish from the board.
        return {
            qualified: all.filter(r => (r.sets_played ?? 0) >= MIN_SETS_FOR_RATE),
            unqualified: all.filter(r => (r.sets_played ?? 0) < MIN_SETS_FOR_RATE),
        };
    }, [rows, filters.sort, filters.order, isRatioSort]);

    const totalColumnCount = 3 + (showRegion ? 1 : 0) + columns.length + 1;

    if (rows.length === 0) {
        return (
            <p className="text-sm text-muted-foreground py-8 text-center">
                No player stats recorded for this season yet.
            </p>
        );
    }

    return (
        <TooltipProvider delayDuration={200}>
            <div className="border border-border rounded-sm overflow-hidden [&>[data-slot=table-container]]:overflow-x-auto">
                {/*
                  * table-fixed is what stops the stat block sliding when the view changes.
                  * Auto layout re-measures every column against its content, so switching
                  * Overview (16 stat columns) to Setting (5) moved the whole grid.
                  */}
                <Table className="table-fixed border-collapse">
                    {/*
                      * Widths live here, not on the cells. Fixed layout reads column widths
                      * from the FIRST row only, and this table's first row is group bands
                      * with colSpan — so per-column widths declared on the second header row
                      * are ignored, and the browser splits each band evenly instead. That is
                      * what made the Season block change width between views. A colgroup is
                      * the one place fixed layout will honour widths when the first row spans
                      * columns. The trailing width-less col absorbs leftover space so no real
                      * column stretches to fill the container.
                      */}
                    <colgroup>
                        <col className={RANK_W} />
                        <col className={PLAYER_W} />
                        <col className={TEAM_W} />
                        {showRegion && <col className={REGION_W} />}
                        {columns.map(col => (
                            <col key={col.key as string} className={playerColWidthClass(col.format)} />
                        ))}
                        <col />
                    </colgroup>
                    <TableHeader>
                        <TableRow className="border-b-0 hover:bg-transparent">
                            <TableHead
                                rowSpan={2}
                                className="sticky left-0 z-10 bg-background text-right align-bottom px-2 text-xs font-semibold uppercase tracking-wider"
                            >
                                #
                            </TableHead>
                            <TableHead
                                rowSpan={2}
                                className="sticky left-14 z-10 bg-background text-left align-bottom px-2 text-xs font-semibold uppercase tracking-wider"
                            >
                                Player
                            </TableHead>
                            <TableHead
                                rowSpan={2}
                                className="text-left align-bottom px-2 border-r border-border/30 text-xs font-semibold uppercase tracking-wider"
                            >
                                Team
                            </TableHead>
                            {showRegion && (
                                <TableHead
                                    rowSpan={2}
                                    className="text-left align-bottom px-2 border-r border-border/30 text-xs font-semibold uppercase tracking-wider"
                                >
                                    Region
                                </TableHead>
                            )}
                            {groups.map((g, idx) => (
                                <TableHead
                                    key={`group-${idx}`}
                                    colSpan={g.columns.length}
                                    className={cn(
                                        "h-7 px-1 text-center text-xs uppercase tracking-wider font-semibold text-muted-foreground",
                                        idx < groups.length - 1 && "border-r border-border/30",
                                    )}
                                >
                                    {g.group}
                                </TableHead>
                            ))}
                            {/*
                              * Not a column — the row's run-out to the container edge. It
                              * carries no border and no label. It exists because `table-fixed`
                              * distributes leftover width across every column that has one,
                              * which would push the stat block sideways as views change the
                              * column count; parking the slack here pins every real column
                              * instead. It also keeps row hover and borders reaching the edge.
                              */}
                            <TableHead rowSpan={2} className="w-auto p-0" />
                        </TableRow>
                        <TableRow className="hover:bg-transparent">
                            {columns.map((col, i) => {
                                const isLastColumn = i === columns.length - 1;
                                const isLastInGroup = isLastColumn || columns[i + 1].group !== col.group;
                                const active = col.key === filters.sort;
                                return (
                                    <TableHead
                                        key={col.key as string}
                                        aria-sort={active ? (filters.order === "desc" ? "descending" : "ascending") : "none"}
                                        className={cn(
                                            "h-8 px-1.5 text-right text-xs font-semibold whitespace-nowrap",
                                            isLastInGroup && !isLastColumn && "border-r border-border/30",
                                            active && "bg-primary/10",
                                        )}
                                    >
                                        <Tooltip>
                                            <TooltipTrigger asChild>
                                                <button
                                                    type="button"
                                                    onClick={() => onSort(col.key)}
                                                    className={cn(
                                                        "inline-flex items-center gap-0.5 rounded-sm px-0.5 transition-colors focus:outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50",
                                                        active ? "text-primary" : "text-foreground/80 hover:text-foreground",
                                                    )}
                                                >
                                                    {col.label}
                                                    {active && (filters.order === "desc"
                                                        ? <ArrowDown className="h-3 w-3" aria-hidden />
                                                        : <ArrowUp className="h-3 w-3" aria-hidden />)}
                                                </button>
                                            </TooltipTrigger>
                                            <TooltipContent side="top">
                                                {col.description}
                                                {/* Stated before the reader sorts, so the split
                                                    that appears afterwards is expected. */}
                                                {col.format === "pct" && (
                                                    <span className="block text-muted-foreground">
                                                        Ranks players with {MIN_SETS_FOR_RATE}+ sets played
                                                    </span>
                                                )}
                                            </TooltipContent>
                                        </Tooltip>
                                    </TableHead>
                                );
                            })}
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {qualified.map((row, i) => (
                            <LeaderboardRow
                                key={`${row.player_id}-${row.season_id}`}
                                row={row}
                                rank={i + 1}
                                columns={columns}
                                sortKey={filters.sort}
                                showRegion={showRegion}
                            />
                        ))}

                        {unqualified.length > 0 && (
                            <>
                                <TableRow className="hover:bg-transparent">
                                    <TableCell
                                        colSpan={totalColumnCount}
                                        className="bg-muted/40 border-y border-border/30 py-1.5 px-3 text-xs text-muted-foreground"
                                    >
                                        <span className="font-medium text-foreground/80">
                                            Below the {MIN_SETS_FOR_RATE}-set minimum
                                        </span>
                                        {" — "}
                                        {activeColumn?.label} is a ratio, so a small sample can top the
                                        board. These {unqualified.length}{" "}
                                        {unqualified.length === 1 ? "player is" : "players are"} listed
                                        but not ranked.
                                    </TableCell>
                                </TableRow>
                                {unqualified.map(row => (
                                    <LeaderboardRow
                                        key={`${row.player_id}-${row.season_id}`}
                                        row={row}
                                        rank={null}
                                        columns={columns}
                                        sortKey={filters.sort}
                                        showRegion={showRegion}
                                    />
                                ))}
                            </>
                        )}
                    </TableBody>
                </Table>
            </div>
        </TooltipProvider>
    );
}

function LeaderboardRow({
    row,
    rank,
    columns,
    sortKey,
    showRegion,
}: {
    row: PlayerLeaderboardRow;
    /** `null` for players below the sets qualifier — listed, but holding no rank. */
    rank: number | null;
    columns: PlayerStatColumn[];
    sortKey: SortKey;
    showRegion: boolean;
}) {
    const teamHref = buildPublicTeamHref({
        regionCode: row.region_code,
        seasonSlug: row.season_slug,
        teamSlug: row.team_slug,
    });

    // Roblox display names are optional and frequently equal the username; showing both
    // in that case is just a repeated line.
    const hasDistinctDisplayName = !!row.display_name && row.display_name !== row.username;

    return (
        // `group` so the sticky identity cells pick up the row's hover — their own
        // `hover:` would only fire when the pointer is over those cells, leaving them
        // unhighlighted whenever the reader is scanning the stat columns.
        // Fixed height on the row, not padding on the cells: a player with a distinct
        // display name renders two lines and one without renders one, so padding alone
        // produced rows of two different heights down the same table. 3.25rem is the
        // natural two-line height — the taller of the two cases, so nothing grew.
        <TableRow className="group h-[3.25rem] hover:bg-muted/30">
            <TableCell className="sticky left-0 z-[1] bg-background group-hover:bg-muted/30 transition-colors py-0 px-2 text-right align-middle">
                <span
                    className={cn(
                        "font-mono tabular-nums text-sm",
                        rank !== null && rank <= 3
                            ? "font-semibold text-foreground"
                            : "text-muted-foreground",
                    )}
                >
                    {rank ?? "—"}
                </span>
            </TableCell>

            <TableCell className="sticky left-14 z-[1] bg-background group-hover:bg-muted/30 transition-colors py-0 px-2 align-middle">
                <div className="flex items-center gap-2.5 min-w-0">
                    {row.avatar_url && (
                        <div className="relative w-10 h-10 shrink-0 rounded-full overflow-hidden bg-muted">
                            <Image src={row.avatar_url} alt="" fill sizes="40px" className="object-cover" unoptimized />
                        </div>
                    )}
                    <div className="min-w-0 leading-tight">
                        <Link
                            href={`/players/${encodeURIComponent(row.username)}`}
                            className="block truncate text-sm font-medium hover:text-primary transition-colors"
                        >
                            {hasDistinctDisplayName ? row.display_name : row.username}
                        </Link>
                        {hasDistinctDisplayName && (
                            <span className="block truncate text-xs text-muted-foreground">
                                {row.username}
                            </span>
                        )}
                    </div>
                </div>
            </TableCell>

            <TableCell className="py-0 px-2 align-middle border-r border-border/30">
                {row.team_name ? (
                    <TeamCell
                        href={teamHref}
                        name={row.team_name}
                        logoUrl={row.team_logo_url}
                        bgRemoved={row.team_logo_bg_removed ?? false}
                    />
                ) : (
                    <span className="text-xs text-muted-foreground">—</span>
                )}
            </TableCell>

            {showRegion && (
                <TableCell className="py-0 px-2 align-middle border-r border-border/30">
                    <span className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                        {row.region_code}
                    </span>
                </TableCell>
            )}

            {columns.map((col, i) => {
                const isLastColumn = i === columns.length - 1;
                const isLastInGroup = isLastColumn || columns[i + 1].group !== col.group;
                const value = row[col.key] as number | null;
                const active = col.key === sortKey;
                return (
                    <TableCell
                        key={col.key as string}
                        className={cn(
                            "py-0 px-1.5 text-right text-xs font-mono tabular-nums whitespace-nowrap",
                            isLastInGroup && !isLastColumn && "border-r border-border/30",
                            // Weight rather than a background tint: the sorted column is the
                            // one the reader is scanning, and a fill competes with the row
                            // hover it sits underneath.
                            active ? "font-semibold text-foreground" : "text-foreground/70",
                        )}
                    >
                        {formatPlayerStat(value, col.format)}
                    </TableCell>
                );
            })}
            <TableCell className="w-auto p-0" />
        </TableRow>
    );
}

function TeamCell({
    href,
    name,
    logoUrl,
    bgRemoved,
}: {
    href: string | null;
    name: string;
    logoUrl: string | null;
    bgRemoved: boolean;
}) {
    const content = (
        <>
            {/* Sized to the 3.25rem row rather than to the text beside it — the row height
                is the constraint, and the logo is the fastest thing to recognise here. */}
            {logoUrl && (
                <div className="relative w-10 h-10 shrink-0">
                    <Image
                        src={logoUrl}
                        alt=""
                        fill
                        sizes="40px"
                        className={getLogoClassName(bgRemoved)}
                        unoptimized
                    />
                </div>
            )}
            <span className="truncate text-sm">{name}</span>
        </>
    );

    return href ? (
        <Link
            href={href}
            className="flex items-center gap-2 min-w-0 text-muted-foreground hover:text-primary transition-colors"
        >
            {content}
        </Link>
    ) : (
        <span className="flex items-center gap-2 min-w-0 text-muted-foreground">{content}</span>
    );
}
