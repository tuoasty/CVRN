"use client";

import {Button} from "@/app/components/ui/button";
import {TodayText} from "@/app/components/ui/TodayText";
import {formatWhen} from "@/app/(public)/home/model/format";
import type {PickemMarketView, PickemMatchRow} from "@/server/domains/pickem";
import {cn} from "@/lib/utils";
import {formatChance, formatLockIn, formatOdds} from "./pickemFormat";

const HEAD = "px-4 py-2 text-left text-xs font-semibold text-muted-foreground";
const CELL = "px-4 py-3 align-top";

function matchLabel(row: PickemMatchRow): string {
    const kind = row.matchType === "playoffs" ? "Playoffs" : row.week !== null ? `Week ${row.week}` : "Season";
    return [kind, row.matchCode, `Bo${row.bestOf}`].filter(Boolean).join(" · ");
}

function OutcomeLines({market, variant}: {market: PickemMarketView | undefined; variant: "winner" | "length"}) {
    if (!market) return null;
    return (
        <dl className="space-y-1">
            {market.outcomes.map(o => (
                <div key={o.key} className="flex items-baseline gap-3 leading-5">
                    <dt className={variant === "winner" ? "sr-only" : "w-7 font-mono text-xs text-muted-foreground"}>{o.label}</dt>
                    <dd className="font-mono text-sm tabular-nums text-foreground">
                        {formatOdds(o.odds)}
                        {variant === "winner" && <span className="ml-3 text-xs text-muted-foreground">{formatChance(o.startProb)}</span>}
                    </dd>
                </div>
            ))}
        </dl>
    );
}

function StatusCell({row, now, onPublish}: {row: PickemMatchRow; now: Date; onPublish: (row: PickemMatchRow) => void}) {
    if (row.state === "unpublished") {
        return (
            <Button type="button" variant="outline" size="sm" className="h-11 rounded-sm md:h-8" onClick={() => onPublish(row)}>
                Publish
            </Button>
        );
    }
    if (row.state === "unpublishable") return <span className="text-sm text-muted-foreground">{row.blockedReason}</span>;
    if (row.state === "open") {
        return (
            <div className="text-sm">
                <p className="font-semibold text-foreground">Open</p>
                {row.lockAt && <p className="text-muted-foreground">{formatLockIn(row.lockAt, now)}</p>}
            </div>
        );
    }
    return <p className="text-sm font-semibold text-foreground">Locked</p>;
}

export function PickemMatchTable({rows, timeZone, now, onPublish}: {
    rows: PickemMatchRow[];
    timeZone: string;
    now: Date;
    onPublish: (row: PickemMatchRow) => void;
}) {
    return (
        <div className="overflow-x-auto">
            <table className="w-full min-w-[760px] border-collapse">
                <thead>
                    <tr className="border-b border-border">
                        <th scope="col" className={cn(HEAD, "sticky left-0 bg-background")}>Match</th>
                        <th scope="col" className={HEAD}>Starts</th>
                        <th scope="col" className={HEAD}>Winner odds / start</th>
                        <th scope="col" className={HEAD}>Length odds</th>
                        <th scope="col" className={cn(HEAD, "text-center")}>Staked</th>
                        <th scope="col" className={HEAD}>Status</th>
                    </tr>
                </thead>
                <tbody>
                    {rows.map(row => {
                        const winner = row.markets.find(m => m.kind === "winner");
                        const length = row.markets.find(m => m.kind === "match_length");
                        const staked = row.markets.reduce((sum, m) => sum + m.pool, 0);
                        const when = formatWhen(row.scheduledAt, timeZone, now);
                        return (
                            <tr key={row.matchId} className="transition-colors duration-150 hover:bg-muted/30 motion-reduce:transition-none">
                                <th scope="row" className={cn(CELL, "sticky left-0 bg-background text-left font-normal")}>
                                    <p className="whitespace-nowrap font-mono text-xs leading-4 text-muted-foreground">{matchLabel(row)}</p>
                                    <p className="mt-1 text-sm font-semibold leading-5 text-foreground">{row.home?.name ?? "TBD"}</p>
                                    <p className="mt-1 text-sm font-semibold leading-5 text-foreground">{row.away?.name ?? "TBD"}</p>
                                </th>
                                <td className={cn(CELL, "whitespace-nowrap text-sm text-foreground")}>
                                    <TodayText active={when.isToday}>{when.label}</TodayText>
                                </td>
                                <td className={cn(CELL, "pt-8")}>
                                    <OutcomeLines market={winner} variant="winner" />
                                </td>
                                <td className={cn(CELL, "pt-8")}>
                                    <OutcomeLines market={length} variant="length" />
                                </td>
                                <td className={cn(CELL, "text-center font-mono text-sm tabular-nums text-foreground")}>
                                    {row.markets.length > 0 ? staked.toLocaleString("en-US") : ""}
                                </td>
                                <td className={CELL}>
                                    <StatusCell row={row} now={now} onPublish={onPublish} />
                                </td>
                            </tr>
                        );
                    })}
                </tbody>
            </table>
        </div>
    );
}
