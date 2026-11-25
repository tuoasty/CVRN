"use client";

import {usePickemMatchDetail} from "@/app/hooks/usePickemBoard";
import {formatWhen} from "@/app/(public)/home/model/format";
import type {PickemDetailMarket, PickemDetailPick, PickemPickStatus} from "@/server/domains/pickem";
import {cn} from "@/lib/utils";
import {formatCurrency, formatOdds} from "./pickemFormat";

const MARKET_TITLES: Record<PickemDetailMarket["kind"], string> = {
    winner: "Winner",
    match_length: "Match length",
};

const MARKET_STATUS: Record<PickemDetailMarket["status"], string> = {
    open: "Open",
    settled: "Settled",
    refunded: "Refunded",
};

const PICK_STATUS: Record<PickemPickStatus, string> = {
    open: "Open",
    won: "Won",
    lost: "Lost",
    refunded: "Refunded",
};

const HEAD = "py-1.5 pr-4 text-left text-xs font-semibold text-muted-foreground whitespace-nowrap";
const NUM = "py-1.5 pr-4 text-right font-mono tabular-nums whitespace-nowrap";

function signed(amount: number): string {
    return `${amount > 0 ? "+" : ""}${formatCurrency(amount)}`;
}

function MarketSummary({market}: {market: PickemDetailMarket}) {
    return (
        <section>
            <h3 className="text-sm font-semibold text-foreground">
                {MARKET_TITLES[market.kind]}
                <span className="ml-2 text-xs font-normal text-muted-foreground">
                    {MARKET_STATUS[market.status]} · {formatCurrency(market.pool)} staked
                </span>
            </h3>
            <table className="mt-2 w-full border-collapse text-sm">
                <thead>
                    <tr className="border-b border-border">
                        <th scope="col" className={HEAD}>Outcome</th>
                        <th scope="col" className={cn(HEAD, "text-right")}>Odds</th>
                        <th scope="col" className={cn(HEAD, "text-right")}>Picks</th>
                        <th scope="col" className={cn(HEAD, "text-right")}>Staked</th>
                        <th scope="col" className={cn(HEAD, "text-right")}>Pays if it wins</th>
                        <th scope="col" className={cn(HEAD, "pr-0 text-right")}>Currency created</th>
                    </tr>
                </thead>
                <tbody>
                    {market.outcomes.map(o => {
                        const won = market.status === "settled" && market.resultOutcome === o.key;
                        const lost = market.status === "settled" && !won;
                        return (
                            <tr key={o.key} className={cn(lost && "text-muted-foreground")}>
                                <th scope="row" className={cn("py-1.5 pr-4 text-left", won ? "font-semibold text-foreground" : "font-normal")}>
                                    {o.label}
                                    {won && <span className="ml-2 text-xs font-normal text-muted-foreground">Result</span>}
                                </th>
                                <td className={NUM}>{formatOdds(o.odds)}</td>
                                <td className={NUM}>{o.picks}</td>
                                <td className={NUM}>{formatCurrency(o.staked)}</td>
                                <td className={NUM}>{formatCurrency(o.paysIfWins)}</td>
                                <td className={cn(NUM, "pr-0")}>{signed(o.paysIfWins - market.pool)}</td>
                            </tr>
                        );
                    })}
                </tbody>
            </table>
        </section>
    );
}

function PlayerName({pick}: {pick: PickemDetailPick}) {
    return (
        <a
            href={`https://www.roblox.com/users/${pick.robloxUserId}/profile`}
            target="_blank"
            rel="noopener noreferrer"
            className="text-foreground underline underline-offset-2 hover:decoration-2 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-foreground"
        >
            {pick.username ?? <span className="font-mono">{pick.robloxUserId}</span>}
        </a>
    );
}

function PicksTable({picks, timeZone, now}: {picks: PickemDetailPick[]; timeZone: string; now: Date}) {
    return (
        <div className="overflow-x-auto">
            <table className="w-full min-w-[680px] border-collapse text-sm">
                <thead>
                    <tr className="border-b border-border">
                        <th scope="col" className={HEAD}>Player</th>
                        <th scope="col" className={HEAD}>Market</th>
                        <th scope="col" className={HEAD}>Pick</th>
                        <th scope="col" className={cn(HEAD, "text-right")}>Stake</th>
                        <th scope="col" className={cn(HEAD, "text-right")}>Odds</th>
                        <th scope="col" className={cn(HEAD, "text-right")}>Payout</th>
                        <th scope="col" className={HEAD}>Status</th>
                        <th scope="col" className={cn(HEAD, "pr-0")}>Claimed</th>
                    </tr>
                </thead>
                <tbody>
                    {picks.map(pick => (
                        <tr key={pick.pickId} className={cn(pick.status === "lost" && "text-muted-foreground")}>
                            <th scope="row" className="py-1.5 pr-4 text-left font-normal">
                                <PlayerName pick={pick} />
                                {pick.displayName && pick.displayName !== pick.username && (
                                    <span className="ml-2 text-xs text-muted-foreground">{pick.displayName}</span>
                                )}
                            </th>
                            <td className="whitespace-nowrap py-1.5 pr-4">{MARKET_TITLES[pick.kind]}</td>
                            <td className="whitespace-nowrap py-1.5 pr-4">{pick.outcomeLabel}</td>
                            <td className={NUM}>{formatCurrency(pick.stake)}</td>
                            <td className={NUM}>{pick.status === "refunded" ? "" : formatOdds(pick.odds)}</td>
                            <td className={NUM}>
                                {formatCurrency(pick.payout)}
                                {pick.status === "open" && <span className="ml-1 font-sans text-xs text-muted-foreground">if it wins</span>}
                            </td>
                            <td className={cn("whitespace-nowrap py-1.5 pr-4", pick.status === "won" && "font-semibold text-foreground")}>
                                {PICK_STATUS[pick.status]}
                            </td>
                            <td className="whitespace-nowrap py-1.5 text-muted-foreground">
                                {pick.claimedAt ? formatWhen(pick.claimedAt, timeZone, now).label : pick.status === "open" ? "" : "Not yet"}
                            </td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    );
}

export function PickemMatchDetail({matchId, timeZone, now}: {matchId: string; timeZone: string; now: Date}) {
    const {detail, isLoading, error} = usePickemMatchDetail(matchId);

    if (error) return <p className="py-4 text-sm text-destructive">Picks failed to load: {error}</p>;
    if (isLoading || !detail) return <p className="py-4 text-sm text-muted-foreground" aria-busy="true">Loading picks...</p>;

    return (
        <div className="space-y-6 py-2">
            <div className="grid gap-6 lg:grid-cols-2">
                {detail.markets.map(market => <MarketSummary key={market.id} market={market} />)}
            </div>
            {detail.picks.length === 0 ? (
                <p className="text-sm text-muted-foreground">No picks yet. Picks placed in the game show up here within a minute.</p>
            ) : (
                <section>
                    <h3 className="text-sm font-semibold text-foreground">
                        Picks
                        <span className="ml-2 text-xs font-normal text-muted-foreground">{detail.picks.length}</span>
                    </h3>
                    {detail.namesMissing && (
                        <p className="mt-1 text-xs text-muted-foreground">Some names could not be loaded from Roblox, so their ids are shown.</p>
                    )}
                    <div className="mt-2">
                        <PicksTable picks={detail.picks} timeZone={timeZone} now={now} />
                    </div>
                </section>
            )}
        </div>
    );
}
