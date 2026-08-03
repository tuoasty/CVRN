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
import {LeaderboardDisplayRow} from "@/server/domains/player";
import {
    STAT_VIEW_COLUMNS,
    MIN_SETS_FOR_RATE,
    PlayerStatColumn,
    formatPlayerStat,
    groupPlayerColumns,
    playerColWidthClass,
} from "@/app/features/player/playerStatColumnMeta";
import {LeaderboardFilters, matchesPlayerQuery, SortKey} from "./useLeaderboardFilters";

type Props = {

    rows: LeaderboardDisplayRow[];
    filters: LeaderboardFilters;
    onSort: (key: SortKey) => void;
    onClearSearch: () => void;

    showRegion?: boolean;
    emptyMessage?: string;
};

function compareRows(a: LeaderboardDisplayRow, b: LeaderboardDisplayRow, key: SortKey, desc: boolean): number {
    const av = a[key] as number | null;
    const bv = b[key] as number | null;
    if (av === null || av === undefined) return bv === null || bv === undefined ? 0 : 1;
    if (bv === null || bv === undefined) return -1;
    if (av === bv) return 0;
    return desc ? bv - av : av - bv;
}

const rowKey = (row: LeaderboardDisplayRow) => `${row.player_id}-${row.season_id ?? row.region_code}`;

const RANK_W = "w-14";
const PLAYER_W = "w-52";
const TEAM_W = "w-36";
const REGION_W = "w-10";

const Z_HEAD = "z-20";
const Z_HEAD_CORNER = "z-10";
const Z_BODY_STICKY = "z-10";

const HEAD_RULE = "shadow-[inset_0_-1px_0_var(--border)]";

const HEAD_BG = "bg-background";
const HEAD_BG_ACTIVE = "bg-[color-mix(in_srgb,hsl(var(--primary))_10%,hsl(var(--background)))]";

export default function LeaderboardTable({
    rows,
    filters,
    onSort,
    onClearSearch,
    showRegion = false,
    emptyMessage = "No player stats recorded yet.",
}: Props) {
    const columns = STAT_VIEW_COLUMNS[filters.view];
    const groups = groupPlayerColumns(columns);

    const activeColumn = columns.find(c => c.key === filters.sort);
    const isRatioSort = activeColumn?.format === "pct";

    const {qualified, unqualified} = useMemo(() => {
        const desc = filters.order === "desc";
        const all = [...rows].sort(
            (a, b) =>
                compareRows(a, b, filters.sort, desc) ||
                (b.sets_played ?? 0) - (a.sets_played ?? 0) ||
                a.username.localeCompare(b.username)
        );

        if (!isRatioSort) return {qualified: all, unqualified: []};
        return {
            qualified: all.filter(r => (r.sets_played ?? 0) >= MIN_SETS_FOR_RATE),
            unqualified: all.filter(r => (r.sets_played ?? 0) < MIN_SETS_FOR_RATE),
        };
    }, [rows, filters.sort, filters.order, isRatioSort]);

    const visible = useMemo(() => {
        let previousValue: number | null | undefined;
        let previousRank = 0;

        return qualified
            .map((row, i) => {
                const value = row[filters.sort] as number | null;
                const rank = i > 0 && value === previousValue ? previousRank : i + 1;
                previousValue = value;
                previousRank = rank;
                return {row, rank};
            })
            .filter(({row}) => matchesPlayerQuery(row, filters.q));
    }, [qualified, filters.sort, filters.q]);

    const visibleUnqualified = useMemo(
        () => unqualified.filter(row => matchesPlayerQuery(row, filters.q)),
        [unqualified, filters.q]
    );

    const totalColumnCount = 3 + (showRegion ? 1 : 0) + columns.length + 1;

    if (rows.length === 0) {
        return <p className="text-sm text-muted-foreground py-8 text-center">{emptyMessage}</p>;
    }

    const searching = filters.q.trim() !== "";
    if (searching && visible.length === 0 && visibleUnqualified.length === 0) {
        return (
            <div className="py-12 text-center">
                <p className="text-sm text-muted-foreground">
                    No player matching &ldquo;{filters.q}&rdquo;.
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                    Search by username or display name.
                </p>
                <button
                    type="button"
                    onClick={onClearSearch}
                    className="mt-4 text-sm text-primary underline-offset-4 hover:underline rounded-sm focus:outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50"
                >
                    Clear search
                </button>
            </div>
        );
    }

    return (
        <TooltipProvider delayDuration={200}>
            <div
                className={cn(
                    "border border-border rounded-sm",
                    "[&>[data-slot=table-container]]:max-h-[calc(100vh-18rem)]",
                    "[&>[data-slot=table-container]]:min-h-[20rem]",
                    "[&>[data-slot=table-container]]:overflow-auto",
                )}
            >
                <Table className="table-fixed border-collapse">
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
                    <TableHeader className={cn("h-7 sticky top-0 bg-background", Z_HEAD)}>
                        <TableRow className="border-b-0 hover:bg-transparent">
                            <TableHead
                                rowSpan={2}
                                className={cn(
                                    "sticky left-0 text-right align-bottom px-2 py-0 my-0 text-xs font-semibold uppercase tracking-wider",
                                    HEAD_BG,
                                    Z_HEAD_CORNER,
                                    HEAD_RULE,
                                )}
                            >
                                #
                            </TableHead>
                            <TableHead
                                rowSpan={2}
                                className={cn(
                                    "sticky left-14 text-left align-bottom px-2 text-xs font-semibold uppercase tracking-wider",
                                    HEAD_BG,
                                    Z_HEAD_CORNER,
                                    HEAD_RULE,
                                )}
                            >
                                Player
                            </TableHead>
                            <TableHead
                                rowSpan={2}
                                className={cn(
                                    "text-left align-bottom px-2 border-r border-border/30 text-xs font-semibold uppercase tracking-wider",
                                    HEAD_BG,
                                    HEAD_RULE,
                                )}
                            >
                                Team
                            </TableHead>
                            {showRegion && (
                                <TableHead
                                    rowSpan={2}
                                    className={cn(

                                        "text-left align-bottom px-1 border-r border-border/30 text-xs font-semibold uppercase tracking-wider",
                                        HEAD_BG,
                                        HEAD_RULE,
                                    )}
                                >
                                    <Tooltip>
                                        <TooltipTrigger asChild>
                                            <span>Reg</span>
                                        </TooltipTrigger>
                                        <TooltipContent side="top">Region</TooltipContent>
                                    </Tooltip>
                                </TableHead>
                            )}
                            {groups.map((g, idx) => (
                                <TableHead
                                    key={`group-${idx}`}
                                    colSpan={g.columns.length}
                                    className={cn(
                                        "h-7 px-1 text-center text-xs uppercase tracking-wider font-semibold text-muted-foreground",
                                        HEAD_BG,
                                        idx < groups.length - 1 && "border-r border-border/30",
                                    )}
                                >
                                    {g.group}
                                </TableHead>
                            ))}
                            {}
                            <TableHead
                                rowSpan={2}
                                className={cn("w-auto p-0", HEAD_BG, HEAD_RULE)}
                            />
                        </TableRow>
                        <TableRow className="h-8 hover:bg-transparent">
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
                                            HEAD_RULE,
                                            isLastInGroup && !isLastColumn && "border-r border-border/30",
                                            active ? HEAD_BG_ACTIVE : HEAD_BG,
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
                                                {}
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
                        {visible.map(({row, rank}) => (
                            <LeaderboardRow
                                key={rowKey(row)}
                                row={row}
                                rank={rank}
                                columns={columns}
                                sortKey={filters.sort}
                                showRegion={showRegion}
                            />
                        ))}

                        {visibleUnqualified.length > 0 && (
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
                                        board. These {visibleUnqualified.length}{" "}
                                        {visibleUnqualified.length === 1 ? "player is" : "players are"} listed
                                        but not ranked.
                                    </TableCell>
                                </TableRow>
                                {visibleUnqualified.map(row => (
                                    <LeaderboardRow
                                        key={rowKey(row)}
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
    row: LeaderboardDisplayRow;

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

    const hasDistinctDisplayName = !!row.display_name && row.display_name !== row.username;

    return (

        <TableRow className="group h-[3.25rem] hover:bg-muted/30">
            <TableCell
                className={cn(
                    "sticky left-0 bg-background group-hover:bg-muted/30 transition-colors py-0 px-2 text-right align-middle",
                    Z_BODY_STICKY,
                )}
            >
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

            <TableCell
                className={cn(
                    "sticky left-14 bg-background group-hover:bg-muted/30 transition-colors py-0 px-2 align-middle",
                    Z_BODY_STICKY,
                )}
            >
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
            {}
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
