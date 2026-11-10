"use client";

import {Fragment} from "react";
import Link from "next/link";
import {ChevronDown} from "lucide-react";
import {cn} from "@/lib/utils";
import {TeamLogo} from "@/app/features/player/detail/TeamLogoLink";
import {buildPublicTeamHref} from "@/app/utils/matchDetailHref";
import type {SortColumn, StandingsRow, StandingsTableModel, ZoneRule} from "../model/types";

export type StandingsLinkMode = "public" | "admin";

type ColumnKey = "mp" | "w" | "l" | "sets" | "diff" | "metric" | "form" | "next";

const COLUMN_SPAN = 10;
const CELL = "px-2 py-3 sm:px-4";
const NUM = "text-center font-mono tabular-nums";

const VISIBILITY: Record<ColumnKey, string> = {
    mp: "hidden min-[400px]:table-cell",
    w: "",
    l: "",
    sets: "hidden min-[480px]:table-cell",
    diff: "hidden min-[560px]:table-cell",
    metric: "",
    form: "hidden lg:table-cell",
    next: "hidden lg:table-cell",
};

const SORT_KEY: Record<SortColumn, ColumnKey> = {lvr: "metric", w: "w", pts: "metric"};

function formatMetric(value: number, method: StandingsTableModel["method"]): string {
    if (method === "lvr") return value.toFixed(1);
    return Number.isInteger(value) ? String(value) : value.toFixed(1);
}

function formatDiff(value: number): string {
    return value > 0 ? `+${value}` : String(value);
}

function HeaderCell({column, label, title, sorted}: {column: ColumnKey; label: string; title?: string; sorted: boolean}) {
    return (
        <th
            scope="col"
            aria-sort={sorted ? "descending" : undefined}
            title={title}
            className={cn(
                CELL,
                "pb-2 pt-0 text-xs font-semibold",
                column === "form" ? "text-left" : "text-center",
                VISIBILITY[column],
                sorted ? "text-foreground" : "text-muted-foreground",
            )}
        >
            {sorted ? (
                <span className="inline-flex items-center gap-0.5 underline decoration-2 underline-offset-[6px]">
                    {label}
                    <ChevronDown aria-hidden className="h-3 w-3" />
                </span>
            ) : label}
        </th>
    );
}

function ZoneRuleRow({rule}: {rule: ZoneRule}) {
    const solid = rule.variant === "solid";
    return (
        <tr aria-hidden>
            <td colSpan={COLUMN_SPAN} className="p-0">
                <div className="relative h-5">
                    <div className={cn("absolute inset-x-0 top-1/2 border-t", solid ? "border-muted-foreground" : "border-dashed border-border")} />
                    <span className={cn(
                        "absolute right-0 top-1/2 -translate-y-1/2 bg-background pl-2 text-[11px] font-semibold uppercase tracking-wider",
                        solid ? "text-foreground" : "text-muted-foreground",
                    )}>
                        {rule.label}
                    </span>
                </div>
            </td>
        </tr>
    );
}

function TeamCell({row, regionCode, seasonSlug}: {row: StandingsRow; regionCode: string; seasonSlug: string}) {
    const href = buildPublicTeamHref({regionCode, seasonSlug, teamSlug: row.team.slug});
    const body = (
        <span className="flex min-w-0 items-center gap-2 sm:gap-3">
            <TeamLogo team={{team_name: row.team.name, team_logo_url: row.team.logoUrl, team_logo_bg_removed: row.team.logoBgRemoved}} size={28} />
            <span className="truncate font-medium">{row.team.name}</span>
        </span>
    );
    return (
        <td className={cn(CELL, "w-full max-w-0")}>
            {href ? <Link href={href} prefetch={false} className="block min-w-0 hover:underline">{body}</Link> : body}
        </td>
    );
}

export function StandingsGrid({model, regionCode, seasonSlug, renderForm, renderNext}: {
    model: StandingsTableModel;
    regionCode: string;
    seasonSlug: string;
    renderForm?: (row: StandingsRow) => React.ReactNode;
    renderNext?: (row: StandingsRow) => React.ReactNode;
}) {
    const sortedKey = SORT_KEY[model.sortColumn];
    const metricLabel = model.method === "lvr" ? "LVR" : "Pts";
    const rulesByRank = new Map(model.zones.map(z => [z.afterRank, z]));
    const header = (column: ColumnKey, label: string, title?: string) => (
        <HeaderCell column={column} label={label} title={title} sorted={sortedKey === column} />
    );

    return (
        <table className="w-full border-collapse text-sm">
            <thead>
                <tr className="border-b border-border">
                    <th scope="col" className={cn(CELL, "pb-2 pt-0 text-left text-xs font-semibold text-muted-foreground")}>#</th>
                    <th scope="col" className={cn(CELL, "pb-2 pt-0 text-left text-xs font-semibold text-muted-foreground")}>Team</th>
                    {header("mp", "MP", "Matches played")}
                    {header("w", "W", "Wins")}
                    {header("l", "L", "Losses")}
                    {header("sets", "Sets", "Sets won-lost")}
                    {header("diff", "+/-", "Set difference")}
                    {header("metric", metricLabel, model.method === "lvr" ? "Lego Volleyball Rating" : "Points")}
                    {header("form", "Form", "Last 5 season matches")}
                    {model.showNext && header("next", "Next", "Next match")}
                </tr>
            </thead>
            <tbody>
                {model.rows.map(row => {
                    const rule = row.rank !== null ? rulesByRank.get(row.rank) : undefined;
                    return (
                        <Fragment key={row.team.id}>
                            <tr className="transition-colors duration-150 hover:bg-muted/30 motion-reduce:transition-none">
                                <td className={cn(CELL, "font-mono tabular-nums text-muted-foreground")}>{row.rank ?? "-"}</td>
                                <TeamCell row={row} regionCode={regionCode} seasonSlug={seasonSlug} />
                                <td className={cn(CELL, NUM, VISIBILITY.mp)}>{row.played}</td>
                                <td className={cn(CELL, NUM, sortedKey === "w" && "font-semibold")}>{row.wins}</td>
                                <td className={cn(CELL, NUM)}>{row.losses}</td>
                                <td className={cn(CELL, NUM, VISIBILITY.sets)}>{row.setsWon}-{row.setsLost}</td>
                                <td className={cn(CELL, NUM, VISIBILITY.diff)}>{formatDiff(row.setDiff)}</td>
                                <td className={cn(CELL, NUM, sortedKey === "metric" && "font-semibold")}>{formatMetric(row.metric, model.method)}</td>
                                <td className={cn(CELL, VISIBILITY.form)}>{renderForm?.(row)}</td>
                                {model.showNext && <td className={cn(CELL, "text-center", VISIBILITY.next)}>{renderNext?.(row)}</td>}
                            </tr>
                            {rule && <ZoneRuleRow rule={rule} />}
                        </Fragment>
                    );
                })}
            </tbody>
        </table>
    );
}
