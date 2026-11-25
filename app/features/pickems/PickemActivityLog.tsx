"use client";

import {useState} from "react";
import {Button} from "@/app/components/ui/button";
import {formatWhen} from "@/app/(public)/home/model/format";
import {usePickemActivity} from "@/app/hooks/usePickemBoard";
import type {PickemActivitySource, PickemAdminActivity, PickemGameActivity} from "@/server/domains/pickem";
import {cn} from "@/lib/utils";
import {formatCurrency} from "./pickemFormat";

const SOURCES: {value: PickemActivitySource; label: string}[] = [
    {value: "all", label: "All"},
    {value: "admin", label: "Admin"},
    {value: "game", label: "Game"},
];

const EMPTY: Record<PickemActivitySource, string> = {
    all: "Nothing has happened in this season's pickems yet. Publishing a match or a pick from the game shows up here.",
    admin: "No admin actions in this season's pickems yet. Publish, settle, refund and settings changes show up here.",
    game: "No picks or claims from the game in this season yet.",
};

function gameAction(entry: PickemGameActivity): string {
    if (entry.kind === "placed") return `picked ${entry.outcomeLabel} for ${formatCurrency(entry.stake)}`;
    if (entry.kind === "claimed") {
        return entry.payout && entry.payout > 0 ? `claimed ${formatCurrency(entry.payout)}` : "claimed a loss, 0 paid";
    }
    const switched = entry.previousOutcomeLabel !== null && entry.previousOutcomeLabel !== entry.outcomeLabel;
    const raised = entry.previousStake !== null && entry.previousStake !== entry.stake;
    const stakes = `${formatCurrency(entry.previousStake ?? 0)} to ${formatCurrency(entry.stake)}`;
    if (switched && raised) return `switched from ${entry.previousOutcomeLabel} to ${entry.outcomeLabel} and raised ${stakes}`;
    if (switched) return `switched from ${entry.previousOutcomeLabel} to ${entry.outcomeLabel}`;
    return `raised ${entry.outcomeLabel} from ${stakes}`;
}

function gameDetail(entry: PickemGameActivity): string {
    const parts = [entry.matchTitle, entry.marketLabel];
    if (entry.kind === "claimed") parts.push(`pick ${entry.outcomeLabel}, stake ${formatCurrency(entry.stake)}`);
    else if (entry.charged !== null) parts.push(`charged ${formatCurrency(entry.charged)}`);
    return parts.join(" · ");
}

function GameLine({entry}: {entry: PickemGameActivity}) {
    return (
        <>
            <p className="text-sm text-foreground">
                <a
                    href={`https://www.roblox.com/users/${entry.robloxUserId}/profile`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="font-semibold underline underline-offset-2 hover:decoration-2 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-foreground"
                >
                    {entry.username ?? <span className="font-mono">{entry.robloxUserId}</span>}
                </a>{" "}
                {gameAction(entry)}
            </p>
            <p className="mt-0.5 text-xs text-muted-foreground">{gameDetail(entry)}</p>
        </>
    );
}

function AdminLine({entry}: {entry: PickemAdminActivity}) {
    return (
        <>
            <p className="text-sm text-foreground">
                <span className="font-semibold">{entry.actor ?? "Unknown admin"}</span>{" "}
                {entry.summary.charAt(0).toLowerCase() + entry.summary.slice(1)}
                {entry.denied && <span className="ml-2 text-xs font-semibold text-destructive">Denied</span>}
            </p>
            {entry.matches.length > 0 && (
                <p className="mt-0.5 text-xs text-muted-foreground">{entry.matches.join(", ")}</p>
            )}
        </>
    );
}

export function PickemActivityLog({seasonId, timeZone, now}: {seasonId: string; timeZone: string; now: Date}) {
    const [source, setSource] = useState<PickemActivitySource>("all");
    const {entries, hasMore, isLoading, isLoadingMore, error, loadMore} = usePickemActivity(seasonId, source);

    return (
        <div className="mt-6">
            <div role="group" aria-label="Show activity from" className="flex gap-4">
                {SOURCES.map(s => (
                    <button
                        key={s.value}
                        type="button"
                        aria-pressed={source === s.value}
                        onClick={() => setSource(s.value)}
                        className={cn(
                            "min-h-11 cursor-pointer border-b-2 text-sm transition-colors duration-150 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-foreground motion-reduce:transition-none md:min-h-8",
                            source === s.value ? "border-foreground font-semibold text-foreground" : "border-transparent text-muted-foreground hover:text-foreground",
                        )}
                    >
                        {s.label}
                    </button>
                ))}
            </div>

            {error && <p className="py-16 text-center text-sm text-destructive">Activity failed to load: {error}</p>}
            {!error && isLoading && <p className="py-16 text-center text-sm text-muted-foreground" aria-busy="true">Loading activity...</p>}
            {!error && !isLoading && entries.length === 0 && (
                <p className="py-16 text-center text-sm text-muted-foreground">{EMPTY[source]}</p>
            )}

            {entries.length > 0 && (
                <ol className="mt-4">
                    {entries.map(entry => (
                        <li key={entry.key} className="grid grid-cols-[7rem_minmax(0,1fr)] gap-x-4 border-b border-border py-3 sm:grid-cols-[9rem_minmax(0,1fr)]">
                            <div>
                                <time dateTime={entry.createdAt} className="block font-mono text-xs text-muted-foreground">
                                    {formatWhen(entry.createdAt, timeZone, now).label}
                                </time>
                                <p className="mt-0.5 text-xs text-muted-foreground">{entry.source === "admin" ? "Admin" : "Game"}</p>
                            </div>
                            <div className="min-w-0 break-words">
                                {entry.source === "admin" ? <AdminLine entry={entry} /> : <GameLine entry={entry} />}
                            </div>
                        </li>
                    ))}
                </ol>
            )}

            {hasMore && (
                <div className="mt-4 flex justify-center">
                    <Button type="button" variant="outline" size="sm" className="h-11 rounded-sm md:h-8" disabled={isLoadingMore} onClick={loadMore}>
                        {isLoadingMore ? "Loading..." : "Load older"}
                    </Button>
                </div>
            )}
        </div>
    );
}
